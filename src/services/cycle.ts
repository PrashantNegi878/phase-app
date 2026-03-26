import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { DailyLog, CycleData, TrackerProfile, PartnerProfile } from '../types';
import { calculateCyclePhase, calculateSymptomScore } from '../utils/pcod-algorithm';
import { getToday, normalizeDate, calculateDayOfCycle, calculatePhaseDates } from '../utils/dateUtils';

export const cycleService = {
  // Log daily symptoms
  async logDailySymptoms(userId: string, date: Date, symptoms: any): Promise<string> {
    // Ensure date is normalized to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const symptomScore = calculateSymptomScore(symptoms);

    const logData: DailyLog = {
      userId,
      date: normalizedDate,
      symptoms,
      symptomScore,
      notes: symptoms.notes || '',
    };

    const docRef = await addDoc(collection(db, 'dailyLogs'), logData);
    
    // Update cycle data after logging with real-time calculation
    await this.updateCyclePhaseRealTime(userId);
    
    return docRef.id;
  },

  // Get cycle data
  async getCycleData(userId: string): Promise<CycleData | null> {
    const docSnap = await getDoc(doc(db, 'cycleData', userId));
    return docSnap.exists() ? (docSnap.data() as CycleData) : null;
  },

  // Update cycle phase based on symptoms and algorithm
  async updateCyclePhase(userId: string): Promise<void> {
    const trackerProfile = await this.getTrackerProfile(userId);
    if (!trackerProfile) return;

    const logs = await this.getRecentLogs(userId, 40); // Get last 40 days
    const cyclePhase = calculateCyclePhase(logs, trackerProfile.lastPeriodDate);

    const cycleData: CycleData = {
      userId,
      lastPeriodDate: normalizeDate(trackerProfile.lastPeriodDate),
      ...(cyclePhase.ovulationDetectedDate && { ovulationDetectedDate: normalizeDate(cyclePhase.ovulationDetectedDate as Date) }),
      nextPeriodDate: cyclePhase.nextPeriodDate ? normalizeDate(cyclePhase.nextPeriodDate) : null,
      dayOfCycle: cyclePhase.dayOfCycle,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), cycleData);

    // Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: cyclePhase.nextPeriodDate ? normalizeDate(cyclePhase.nextPeriodDate) : null,
      updatedAt: new Date(),
    });
  },

  // Update cycle phase dynamically (real-time calculation)
  async updateCyclePhaseRealTime(userId: string): Promise<void> {
    const trackerProfile = await this.getTrackerProfile(userId);
    if (!trackerProfile) return;

    const existingCycleData = await this.getCycleData(userId);
    const periodEndDate = existingCycleData?.periodEndDate || null;

    const lastPeriod = normalizeDate(trackerProfile.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    
    // Check if ovulation detected from recent logs
    const logs = await this.getRecentLogs(userId, 40);
    const cyclePhase = calculateCyclePhase(logs, trackerProfile.lastPeriodDate);
    

    // Calculate predicted next period date if ovulation not detected
    let nextPeriodDate: Date | null = cyclePhase.nextPeriodDate;
    if (!nextPeriodDate && cyclePhase.ovulationDetectedDate) {
      // If ovulation detected, predict next period based on ovulation + 14 days (luteal phase)
      const ovulationDate = normalizeDate(cyclePhase.ovulationDetectedDate as Date);
      nextPeriodDate = new Date(ovulationDate);
      nextPeriodDate.setDate(nextPeriodDate.getDate() + 16); // 14 days luteal + 2 days ovulation
    } else if (!nextPeriodDate && trackerProfile.lastPeriodDate) {
      // If no ovulation detected, predict next period based on cycle length
      const lastPeriodDate = normalizeDate(trackerProfile.lastPeriodDate);
      nextPeriodDate = new Date(lastPeriodDate);
      nextPeriodDate.setDate(nextPeriodDate.getDate() + trackerProfile.cycleLengthDays);
    }

    // Calculate phase dates for UI rendering
    const phaseDates = calculatePhaseDates(
      trackerProfile.lastPeriodDate,
      cyclePhase.ovulationDetectedDate || null,
      trackerProfile.cycleLengthDays,
      nextPeriodDate, // Pass nextPeriodDate to ensure luteal phase ends correctly
      periodEndDate
    );

    // Ensure all dates are properly normalized before saving
    const normalizedCycleData: CycleData = {
      userId,
      lastPeriodDate: lastPeriod,
      ...(cyclePhase.ovulationDetectedDate && { ovulationDetectedDate: normalizeDate(cyclePhase.ovulationDetectedDate as Date) }),
      nextPeriodDate: nextPeriodDate ? normalizeDate(nextPeriodDate) : null,
      dayOfCycle: dayOfCycle,
      menstrualPhaseStart: phaseDates.menstrualPhaseStart ? normalizeDate(phaseDates.menstrualPhaseStart) : null,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd ? normalizeDate(phaseDates.menstrualPhaseEnd) : null,
      follicularPhaseStart: phaseDates.follicularPhaseStart ? normalizeDate(phaseDates.follicularPhaseStart) : null,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd ? normalizeDate(phaseDates.follicularPhaseEnd) : null,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart ? normalizeDate(phaseDates.ovulationPhaseStart) : null,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd ? normalizeDate(phaseDates.ovulationPhaseEnd) : null,
      lutealPhaseStart: phaseDates.lutealPhaseStart ? normalizeDate(phaseDates.lutealPhaseStart) : null,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd ? normalizeDate(phaseDates.lutealPhaseEnd) : null,
      extendedFollicularPhaseStart: phaseDates.extendedFollicularPhaseStart ? normalizeDate(phaseDates.extendedFollicularPhaseStart) : null,
      extendedFollicularPhaseEnd: phaseDates.extendedFollicularPhaseEnd ? normalizeDate(phaseDates.extendedFollicularPhaseEnd) : null,
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart ? normalizeDate(phaseDates.nextMenstrualPhaseStart) : null,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd ? normalizeDate(phaseDates.nextMenstrualPhaseEnd) : null,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), normalizedCycleData);

    // Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: nextPeriodDate ? normalizeDate(nextPeriodDate) : null,
      updatedAt: new Date(),
    });
  },

  // Record period start and end
  async recordPeriodStart(userId: string, startDate: Date, endDate?: Date, schedule?: string): Promise<void> {
    // Get tracker profile to access cycle length
    const trackerProfile = await this.getTrackerProfile(userId);
    const cycleLengthDays = trackerProfile?.cycleLengthDays || 28;
    
    // Normalize dates to start of day
    const normalizedStartDate = normalizeDate(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    
    let normalizedEndDate: Date | undefined;
    if (endDate) {
      normalizedEndDate = normalizeDate(endDate);
      normalizedEndDate.setHours(0, 0, 0, 0);
    }

    await updateDoc(doc(db, 'trackerProfiles', userId), {
      lastPeriodDate: normalizedStartDate,
      periodEndDate: normalizedEndDate || null,
      ...(schedule && { dailyScheduleConstraints: schedule }),
      updatedAt: new Date(),
    });


    // Calculate correct day of cycle using centralized helper function
    const dayOfCycle = calculateDayOfCycle(normalizedStartDate);
    
    // Calculate predicted next period date based on cycle length
    const predictedNextPeriodDate = new Date(normalizedStartDate);
    predictedNextPeriodDate.setDate(predictedNextPeriodDate.getDate() + cycleLengthDays);

    // Calculate phase dates for UI rendering
    const phaseDates = calculatePhaseDates(
      normalizedStartDate,
      null, // No ovulation detected yet when period starts
      cycleLengthDays,
      predictedNextPeriodDate, // Pass predicted next period date to ensure luteal phase ends correctly
      normalizedEndDate
    );

    // Ensure all dates are properly normalized before saving
    const normalizedCycleData: CycleData = {
      userId,
      lastPeriodDate: normalizedStartDate,
      ...(normalizedEndDate && { periodEndDate: normalizedEndDate }),
      nextPeriodDate: normalizeDate(predictedNextPeriodDate),
      dayOfCycle: dayOfCycle,
      menstrualPhaseStart: phaseDates.menstrualPhaseStart ? normalizeDate(phaseDates.menstrualPhaseStart) : null,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd ? normalizeDate(phaseDates.menstrualPhaseEnd) : null,
      follicularPhaseStart: phaseDates.follicularPhaseStart ? normalizeDate(phaseDates.follicularPhaseStart) : null,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd ? normalizeDate(phaseDates.follicularPhaseEnd) : null,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart ? normalizeDate(phaseDates.ovulationPhaseStart) : null,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd ? normalizeDate(phaseDates.ovulationPhaseEnd) : null,
      lutealPhaseStart: phaseDates.lutealPhaseStart ? normalizeDate(phaseDates.lutealPhaseStart) : null,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd ? normalizeDate(phaseDates.lutealPhaseEnd) : null,
      extendedFollicularPhaseStart: phaseDates.extendedFollicularPhaseStart ? normalizeDate(phaseDates.extendedFollicularPhaseStart) : null,
      extendedFollicularPhaseEnd: phaseDates.extendedFollicularPhaseEnd ? normalizeDate(phaseDates.extendedFollicularPhaseEnd) : null,
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart ? normalizeDate(phaseDates.nextMenstrualPhaseStart) : null,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd ? normalizeDate(phaseDates.nextMenstrualPhaseEnd) : null,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), normalizedCycleData);

    // Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: normalizeDate(predictedNextPeriodDate),
      updatedAt: new Date(),
    });
  },

  // Get recent logs
  async getRecentLogs(userId: string, days: number = 40): Promise<DailyLog[]> {
    const startDate = getToday();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
      collection(db, 'dailyLogs'),
      where('userId', '==', userId),
      where('date', '>=', startDate)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      date: normalizeDate(doc.data().date),
    } as DailyLog));
  },

  // Get tracker profile (helper)
  async getTrackerProfile(uid: string): Promise<TrackerProfile | null> {
    const docSnap = await getDoc(doc(db, 'trackerProfiles', uid));
    return docSnap.exists() ? (docSnap.data() as TrackerProfile) : null;
  },

  // Listen to tracker profile changes in real-time
  onTrackerProfileChange(uid: string, callback: (profile: TrackerProfile | null) => void): () => void {
    return onSnapshot(doc(db, 'trackerProfiles', uid), (docSnap) => {
      const profile = docSnap.exists() ? (docSnap.data() as TrackerProfile) : null;
      callback(profile);
    });
  },

  // Helper: Get linked tracker's cycle data
  async getLinkedTrackerCycleData(partnerId: string): Promise<CycleData | null> {
    const partnerProfile = await this.getPartnerProfile(partnerId);
    if (!partnerProfile?.linkedTrackerId) return null;

    return this.getCycleData(partnerProfile.linkedTrackerId);
  },

  // Listen for linked partners in real-time
  onLinkedPartnersChange(trackerId: string, callback: (hasPartner: boolean) => void): () => void {
    const q = query(
      collection(db, 'partnerProfiles'),
      where('linkedTrackerId', '==', trackerId)
    );
    return onSnapshot(q, (snapshot) => {
      callback(!snapshot.empty);
    }, (error) => {
      console.error("Error listening to linked partners:", error);
      callback(false);
    });
  },

  // Get partner profile (helper)
  async getPartnerProfile(uid: string): Promise<PartnerProfile | null> {
    const docSnap = await getDoc(doc(db, 'partnerProfiles', uid));
    return docSnap.exists() ? (docSnap.data() as PartnerProfile) : null;
  },

  // Update partner profile with support style and schedule
  async updatePartnerProfile(
    userId: string,
    supportStyles: string[],
    scheduleConstraints: string
  ): Promise<void> {
    const partnerDocRef = doc(db, 'partnerProfiles', userId);
    await setDoc(partnerDocRef, {
      userId: userId,
      supportStyles,
      dailyScheduleConstraints: scheduleConstraints,
      updatedAt: new Date(),
    }, { merge: true });
  },

  // Update tracker symptoms to track
  async updateTrackerSymptoms(userId: string, symptoms: string[]): Promise<void> {
    await setDoc(doc(db, 'trackerProfiles', userId), {
      trackedSymptoms: symptoms,
      updatedAt: new Date(),
    }, { merge: true });
  },
};
