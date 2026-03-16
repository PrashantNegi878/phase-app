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
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DailyLog, CycleData, TrackerProfile, PartnerProfile } from '../types';
import { calculateCyclePhase, calculateSymptomScore } from '../utils/pcod-algorithm';
import { getToday, normalizeDate, parseDateFromInput, calculateDayOfCycle, calculateDayOfCycleForDate, calculatePhaseDates } from '../utils/dateUtils';

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
      lastPeriodDate: trackerProfile.lastPeriodDate,
      ...(cyclePhase.ovulationDetectedDate && { ovulationDetectedDate: cyclePhase.ovulationDetectedDate }),
      nextPeriodDate: cyclePhase.nextPeriodDate,
      dayOfCycle: cyclePhase.dayOfCycle,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), cycleData);

    // Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: cyclePhase.nextPeriodDate,
      updatedAt: new Date(),
    });
  },

  // Update cycle phase dynamically (real-time calculation)
  async updateCyclePhaseRealTime(userId: string): Promise<void> {
    console.log('🔄 updateCyclePhaseRealTime called for user:', userId);
    
    const trackerProfile = await this.getTrackerProfile(userId);
    if (!trackerProfile) {
      console.log('❌ No tracker profile found for user:', userId);
      return;
    }

    console.log('📋 Tracker profile found:', {
      lastPeriodDate: trackerProfile.lastPeriodDate,
      cycleLengthDays: trackerProfile.cycleLengthDays
    });

    // Calculate current phase dynamically using the same logic as PCOD algorithm
    const today = getToday();
    const lastPeriod = normalizeDate(trackerProfile.lastPeriodDate);
    
    // Calculate day of cycle dynamically
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    
    console.log('📅 Day of cycle calculated:', dayOfCycle);
    
    // Check if ovulation detected from recent logs
    const logs = await this.getRecentLogs(userId, 40);
    const cyclePhase = calculateCyclePhase(logs, trackerProfile.lastPeriodDate);
    
    console.log('🔬 Cycle phase from algorithm:', cyclePhase);
    
    let currentPhase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'extended-follicular' | 'pending' = 'pending';
    
    if (cyclePhase.ovulationDetectedDate) {
      const ovulationDate = normalizeDate(cyclePhase.ovulationDetectedDate as Date);
      const lastPeriod = normalizeDate(trackerProfile.lastPeriodDate);
      const ovDay = calculateDayOfCycleForDate(ovulationDate, lastPeriod);
      
      console.log('🥚 Ovulation detected at day:', ovDay, 'Current day:', dayOfCycle);
      
      // Determine phase based on current day relative to ovulation
      if (dayOfCycle <= 5) {
        currentPhase = 'menstrual';
        console.log('✅ Setting phase to: menstrual (day', dayOfCycle, '<= 5)');
      } else if (dayOfCycle > 5 && dayOfCycle < ovDay) {
        currentPhase = 'follicular';
        console.log('✅ Setting phase to: follicular (day', dayOfCycle, 'between 5 and', ovDay, ')');
      } else if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) {
        currentPhase = 'ovulation';
        console.log('✅ Setting phase to: ovulation (days', ovDay, 'to', ovDay + 2, ')');
      } else if (dayOfCycle >= ovDay + 3) {
        currentPhase = 'luteal';
        console.log('✅ Setting phase to: luteal (day', dayOfCycle, '>=', ovDay + 3, ')');
      }
    } else {
      // No ovulation detected - use predicted phases
      const expectedOvulationDay = Math.round(trackerProfile.cycleLengthDays / 2);
      
      console.log('🔮 No ovulation detected, using predicted ovulation day:', expectedOvulationDay);
      
      if (dayOfCycle <= 5) {
        currentPhase = 'menstrual';
        console.log('✅ Setting phase to: menstrual (day', dayOfCycle, '<= 5)');
      } else if (dayOfCycle > 5 && dayOfCycle < expectedOvulationDay) {
        currentPhase = 'follicular';
        console.log('✅ Setting phase to: follicular (day', dayOfCycle, 'between 5 and', expectedOvulationDay, ')');
      } else if (dayOfCycle >= expectedOvulationDay && dayOfCycle < expectedOvulationDay + 3) {
        currentPhase = 'ovulation';
        console.log('✅ Setting phase to: ovulation (days', expectedOvulationDay, 'to', expectedOvulationDay + 2, ')');
      } else if (dayOfCycle >= expectedOvulationDay + 3 && dayOfCycle <= expectedOvulationDay + 16) {
        currentPhase = 'luteal';
        console.log('✅ Setting phase to: luteal (days', expectedOvulationDay + 3, 'to', expectedOvulationDay + 16, ')');
      } else if (dayOfCycle > expectedOvulationDay + 16 && dayOfCycle >= 20) {
        currentPhase = 'extended-follicular';
        console.log('✅ Setting phase to: extended-follicular (day', dayOfCycle, '>= 20)');
      } else if (dayOfCycle > expectedOvulationDay + 16) {
        currentPhase = 'follicular';
        console.log('✅ Setting phase to: follicular (day', dayOfCycle, '> extended follicular)');
      }
    }

    console.log('🎯 Final phase determined:', currentPhase);

    // Calculate predicted next period date if ovulation not detected
    let nextPeriodDate = cyclePhase.nextPeriodDate;
    if (!nextPeriodDate && cyclePhase.ovulationDetectedDate) {
      // If ovulation detected, predict next period based on ovulation + 14 days (luteal phase)
      const ovulationDate = normalizeDate(cyclePhase.ovulationDetectedDate as Date);
      nextPeriodDate = new Date(ovulationDate);
      nextPeriodDate.setDate(nextPeriodDate.getDate() + 16); // 14 days luteal + 2 days ovulation
    } else if (!nextPeriodDate) {
      // If no ovulation detected, predict next period based on cycle length
      const lastPeriodDate = trackerProfile.lastPeriodDate;
      if (lastPeriodDate) {
        nextPeriodDate = new Date(lastPeriodDate);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + trackerProfile.cycleLengthDays);
      }
    }

    // Calculate phase dates for UI rendering
    const phaseDates = calculatePhaseDates(
      trackerProfile.lastPeriodDate,
      cyclePhase.ovulationDetectedDate || null,
      trackerProfile.cycleLengthDays,
      nextPeriodDate // Pass nextPeriodDate to ensure luteal phase ends correctly
    );

    const cycleData: CycleData = {
      userId,
      // Remove phase from database - it should be calculated dynamically
      lastPeriodDate: trackerProfile.lastPeriodDate,
      ...(cyclePhase.ovulationDetectedDate && { ovulationDetectedDate: cyclePhase.ovulationDetectedDate }),
      nextPeriodDate: nextPeriodDate,
      dayOfCycle: dayOfCycle,
      // Store phase date ranges for UI rendering
      menstrualPhaseStart: phaseDates.menstrualPhaseStart,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd,
      follicularPhaseStart: phaseDates.follicularPhaseStart,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd,
      lutealPhaseStart: phaseDates.lutealPhaseStart,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd,
      extendedFollicularPhaseStart: phaseDates.extendedFollicularPhaseStart,
      extendedFollicularPhaseEnd: phaseDates.extendedFollicularPhaseEnd,
      // Store next menstrual phase for proper calendar rendering
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd,
      updatedAt: new Date(),
    };

    console.log('💾 Updating cycle data in database:', cycleData);

    try {
      await setDoc(doc(db, 'cycleData', userId), cycleData);
      console.log('✅ Cycle data updated successfully');
    } catch (error) {
      console.error('❌ Error updating cycle data:', error);
    }

    // Update tracker profile
    try {
      await updateDoc(doc(db, 'trackerProfiles', userId), {
        // Remove cyclePhase from tracker profile - it should be calculated dynamically
        nextPeriodDate: nextPeriodDate, // Use calculated nextPeriodDate instead of cyclePhase.nextPeriodDate
        updatedAt: new Date(),
      });
      console.log('✅ Tracker profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating tracker profile:', error);
    }
  },

  // Record period start and end
  async recordPeriodStart(userId: string, startDate: Date, endDate?: Date): Promise<void> {
    // Get tracker profile to access cycle length
    const trackerProfile = await this.getTrackerProfile(userId);
    const cycleLengthDays = trackerProfile?.cycleLengthDays || 28;
    
    // Normalize dates to start of day
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    
    let normalizedEndDate: Date | undefined;
    if (endDate) {
      normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(0, 0, 0, 0);
    }

    await updateDoc(doc(db, 'trackerProfiles', userId), {
      lastPeriodDate: normalizedStartDate,
      updatedAt: new Date(),
    });

    // Calculate correct day of cycle using centralized helper function
    const dayOfCycle = calculateDayOfCycle(normalizedStartDate);
    
    // Determine phase based on period end date if provided, otherwise default to days 1-5
    let phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'extended-follicular' | 'pending';
    
    if (endDate) {
      // Calculate menstrual phase based on actual period duration
      let periodEnd: Date;
      if (typeof endDate === 'string') {
        periodEnd = new Date(endDate);
      } else if (endDate && typeof endDate === 'object' && 'seconds' in endDate) {
        periodEnd = new Date((endDate as any).seconds * 1000);
      } else {
        periodEnd = new Date(endDate);
      }
      
      // Calculate menstrual days using the same logic as calculateDayOfCycle
      const startDateNormalized = typeof startDate === 'string' 
        ? new Date(startDate) 
        : (startDate && typeof startDate === 'object' && 'seconds' in startDate 
          ? new Date((startDate as any).seconds * 1000) 
          : new Date(startDate));
      
      const menstrualDays = Math.floor((periodEnd.getTime() - startDateNormalized.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (dayOfCycle <= menstrualDays) {
        phase = 'menstrual';
      } else {
        phase = 'follicular';
      }
    } else {
      // Default: days 1-5 are menstrual
      if (dayOfCycle <= 5) {
        phase = 'menstrual';
      } else {
        phase = 'follicular';
      }
    }

    // Calculate predicted next period date based on cycle length
    const predictedNextPeriodDate = new Date(normalizedStartDate);
    predictedNextPeriodDate.setDate(predictedNextPeriodDate.getDate() + cycleLengthDays);

    // Calculate phase dates for UI rendering
    const phaseDates = calculatePhaseDates(
      normalizedStartDate,
      null, // No ovulation detected yet when period starts
      cycleLengthDays,
      predictedNextPeriodDate // Pass predicted next period date to ensure luteal phase ends correctly
    );

    const cycleData: CycleData = {
      userId,
      lastPeriodDate: normalizedStartDate,
      ...(normalizedEndDate && { periodEndDate: normalizedEndDate }),
      nextPeriodDate: predictedNextPeriodDate, // Use predicted date instead of null
      dayOfCycle: dayOfCycle,
      // Store phase date ranges for UI rendering
      menstrualPhaseStart: phaseDates.menstrualPhaseStart,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd,
      follicularPhaseStart: phaseDates.follicularPhaseStart,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd,
      lutealPhaseStart: phaseDates.lutealPhaseStart,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd,
      extendedFollicularPhaseStart: phaseDates.extendedFollicularPhaseStart,
      extendedFollicularPhaseEnd: phaseDates.extendedFollicularPhaseEnd,
      // Store next menstrual phase for proper calendar rendering
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), cycleData);

    // Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: predictedNextPeriodDate, // Use predicted date instead of null
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

  // Helper: Get linked tracker's cycle data
  async getLinkedTrackerCycleData(partnerId: string): Promise<CycleData | null> {
    const partnerProfile = await this.getPartnerProfile(partnerId);
    if (!partnerProfile?.linkedTrackerId) return null;

    return this.getCycleData(partnerProfile.linkedTrackerId);
  },

  // Get partner profile (helper)
  async getPartnerProfile(uid: string): Promise<PartnerProfile | null> {
    const docSnap = await getDoc(doc(db, 'partnerProfiles', uid));
    return docSnap.exists() ? (docSnap.data() as PartnerProfile) : null;
  },

  // Update partner profile with support style and schedule
  async updatePartnerProfile(
    userId: string,
    supportStyle: string,
    scheduleConstraints: string
  ): Promise<void> {
    const partnerDocRef = doc(db, 'partnerProfiles', userId);
    
    // Merge to ensure document exists or create if needed
    await setDoc(partnerDocRef, {
      userId: userId,
      supportStyle,
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
