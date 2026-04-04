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
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { DailyLog, CycleData, TrackerProfile, PartnerProfile, CycleHistory } from '../types';
import { calculateCyclePhase, calculateSymptomScore } from '../utils/pcod-algorithm';
import { getToday, normalizeDate, calculatePhaseDates, addDays, daysBetween } from '../utils/dateUtils';
import { MIN_CYCLE_LENGTH_FOR_ARCHIVE, STALE_CYCLE_THRESHOLD_DAYS } from '../constants/cycle';

export const cycleService = {
  // Delete all logs for the current cycle
  async deleteCurrentCycleLogs(userId: string, lastPeriodDate: Date): Promise<void> {
    const q = query(
      collection(db, 'dailyLogs'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(normalizeDate(lastPeriodDate)))
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(document => deleteDoc(document.ref));
    await Promise.all(deletePromises);
  },

  // Listen for recent logs
  onRecentLogsChange(userId: string, count: number, callback: (logs: DailyLog[]) => void): () => void {
    const q = query(
      collection(db, 'dailyLogs'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(count)
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as any[] as DailyLog[];
      callback(logs);
    });
  },

  // Log daily symptoms
  async logDailySymptoms(userId: string, date: Date, symptoms: any): Promise<{ 
    id: string; 
    additionalMessage?: string;
    newCycleLength?: number | null;
    ovulationDetectedDate?: Date | null;
  }> {
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
    const result = await this.updateCyclePhaseRealTime(userId);
    return { 
      id: docRef.id, 
      additionalMessage: result?.additionalMessage,
      newCycleLength: result?.newCycleLength,
      ovulationDetectedDate: result?.ovulationDetectedDate
    };
  },

  // Get cycle data
  async getCycleData(userId: string): Promise<CycleData | null> {
    const docSnap = await getDoc(doc(db, 'cycleData', userId));
    return docSnap.exists() ? (docSnap.data() as CycleData) : null;
  },

  // Update cycle phase dynamically (real-time calculation)
  // manualCycleLength: Optional new length to use (e.g. just changed in Settings)
  async updateCyclePhaseRealTime(userId: string, manualCycleLength?: number): Promise<{ 
    additionalMessage?: string, 
    newCycleLength?: number | null,
    ovulationDetectedDate?: Date | null
  } | null> {
    const trackerProfile = await this.getTrackerProfile(userId);
    if (!trackerProfile) return null;

    const existingCycleData = await this.getCycleData(userId);
    const periodEndDate = existingCycleData?.periodEndDate || null;

    const lastPeriod = normalizeDate(trackerProfile.lastPeriodDate);
    // 1. Determine Cycle Length to use
    // Preference: 1. Manual override, 2. Current profile setting, 3. Default 28
    const currentCycleLength = manualCycleLength || trackerProfile.cycleLengthDays || 28;

    // 2. Check for symptoms (Ovulation Detection)
    const logs = await this.getRecentLogs(userId, 50); // Increased to 50 days
    const cyclePhase = calculateCyclePhase(logs, trackerProfile.lastPeriodDate);
    
    // 3. Determine Next Period Date & Ovulation Priority
    // If manual length is provided, it takes ABSOLUTE priority and clears symptom detection for this month.
    let nextPeriodDate: Date | null = null;
    let effectiveOvulationDate: Date | null = null;

    if (manualCycleLength) {
      nextPeriodDate = addDays(lastPeriod, manualCycleLength);
      effectiveOvulationDate = null; // Ignore symptoms for manual override
    } else {
      nextPeriodDate = cyclePhase.nextPeriodDate;
      effectiveOvulationDate = cyclePhase.ovulationDetectedDate ? normalizeDate(cyclePhase.ovulationDetectedDate) : null;
      
      if (!nextPeriodDate && trackerProfile.lastPeriodDate) {
        nextPeriodDate = addDays(lastPeriod, currentCycleLength);
      } else if (!nextPeriodDate) {
        nextPeriodDate = existingCycleData?.nextPeriodDate || null;
      }
    }

    // 4. Calculate ALL Phase Dates using the authoritative utility
    const phaseDates = calculatePhaseDates(
      lastPeriod,
      effectiveOvulationDate,
      currentCycleLength,
      nextPeriodDate,
      periodEndDate
    );

    // 5. Save EVERYTHING to CycleData (Full Sync)
    const normalizedCycleData: CycleData = {
      userId,
      lastPeriodDate: lastPeriod,
      periodEndDate: periodEndDate ? normalizeDate(periodEndDate) : null,
      ovulationDetectedDate: effectiveOvulationDate,
      nextPeriodDate: nextPeriodDate ? normalizeDate(nextPeriodDate) : null,
      // Comprehensive phase storage
      menstrualPhaseStart: phaseDates.menstrualPhaseStart ? normalizeDate(phaseDates.menstrualPhaseStart) : null,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd ? normalizeDate(phaseDates.menstrualPhaseEnd) : null,
      follicularPhaseStart: phaseDates.follicularPhaseStart ? normalizeDate(phaseDates.follicularPhaseStart) : null,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd ? normalizeDate(phaseDates.follicularPhaseEnd) : null,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart ? normalizeDate(phaseDates.ovulationPhaseStart) : null,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd ? normalizeDate(phaseDates.ovulationPhaseEnd) : null,
      lutealPhaseStart: phaseDates.lutealPhaseStart ? normalizeDate(phaseDates.lutealPhaseStart) : null,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd ? normalizeDate(phaseDates.lutealPhaseEnd) : null,
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart ? normalizeDate(phaseDates.nextMenstrualPhaseStart) : null,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd ? normalizeDate(phaseDates.nextMenstrualPhaseEnd) : null,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), normalizedCycleData);

    // 6. Sync Tracker Profile
    const profileUpdates: any = {
      nextPeriodDate: nextPeriodDate ? normalizeDate(nextPeriodDate) : null,
      updatedAt: new Date(),
    };

    // SMART SYNC: Update typical cycle length ONLY if no manual override is active
    let wasSmartSyncApplied = false;
    let newCalculatedLength = currentCycleLength;

    if (!manualCycleLength && effectiveOvulationDate && nextPeriodDate) {
      const actualLength = Math.round((nextPeriodDate.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
      // Only sync if within realistic PCOD bounds (21-50 days)
      if (actualLength >= 21 && actualLength <= 50) {
        profileUpdates.cycleLengthDays = actualLength;
        newCalculatedLength = actualLength;
        wasSmartSyncApplied = true;
      }
    }

    await updateDoc(doc(db, 'trackerProfiles', userId), profileUpdates);

    return { 
      additionalMessage: cyclePhase.additionalMessage,
      newCycleLength: wasSmartSyncApplied ? newCalculatedLength : null,
      ovulationDetectedDate: effectiveOvulationDate
    };
  },
  
  // Internal helper to archive the outgoing cycle before starting a new one
  async archiveCurrentCycle(userId: string, nextCycleStartDate: Date): Promise<void> {
    const currentCycle = await this.getCycleData(userId);
    if (!currentCycle || !currentCycle.lastPeriodDate) return;

    const startDate = normalizeDate(currentCycle.lastPeriodDate);
    const endDate = normalizeDate(nextCycleStartDate);
    const length = daysBetween(startDate, endDate);

    // Only archive if it's a valid completed cycle (prevents duplicates or accidental logs)
    if (length < MIN_CYCLE_LENGTH_FOR_ARCHIVE) return;

    // 1. Get tracker profile for typical cycle length
    const trackerProfile = await this.getTrackerProfile(userId);
    const typicalLength = trackerProfile?.cycleLengthDays || 28;

    // 2. Perform a FULL RECONSTRUCTION of the outgoing cycle using the actual next period start date.
    // This correctly identifies "Extended Follicular" phases if the cycle was long.
    const reconstructedPhases = calculatePhaseDates(
      startDate,
      currentCycle.ovulationDetectedDate ? normalizeDate(currentCycle.ovulationDetectedDate) : null,
      typicalLength,
      endDate,
      currentCycle.periodEndDate ? normalizeDate(currentCycle.periodEndDate) : null
    );

    const historyEntry: CycleHistory = {
      userId,
      startDate: Timestamp.fromDate(startDate) as any,
      endDate: Timestamp.fromDate(endDate) as any,
      ovulationDate: currentCycle.ovulationDetectedDate 
        ? Timestamp.fromDate(normalizeDate(currentCycle.ovulationDetectedDate)) as any 
        : (reconstructedPhases.ovulationPhaseStart ? Timestamp.fromDate(reconstructedPhases.ovulationPhaseStart) as any : null),
      cycleLength: length,
      dayOvulationOccurred: (currentCycle.ovulationDetectedDate || reconstructedPhases.ovulationPhaseStart)
        ? Math.round((normalizeDate(currentCycle.ovulationDetectedDate || reconstructedPhases.ovulationPhaseStart!).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : null,
      
      // Frozen reconstructed phase dates for "Time Machine" accuracy
      menstrualPhaseStart: reconstructedPhases.menstrualPhaseStart ? Timestamp.fromDate(reconstructedPhases.menstrualPhaseStart) as any : null,
      menstrualPhaseEnd: reconstructedPhases.menstrualPhaseEnd ? Timestamp.fromDate(reconstructedPhases.menstrualPhaseEnd) as any : null,
      follicularPhaseStart: reconstructedPhases.follicularPhaseStart ? Timestamp.fromDate(reconstructedPhases.follicularPhaseStart) as any : null,
      follicularPhaseEnd: reconstructedPhases.follicularPhaseEnd ? Timestamp.fromDate(reconstructedPhases.follicularPhaseEnd) as any : null,
      ovulationPhaseStart: reconstructedPhases.ovulationPhaseStart ? Timestamp.fromDate(reconstructedPhases.ovulationPhaseStart) as any : null,
      ovulationPhaseEnd: reconstructedPhases.ovulationPhaseEnd ? Timestamp.fromDate(reconstructedPhases.ovulationPhaseEnd) as any : null,
      lutealPhaseStart: reconstructedPhases.lutealPhaseStart ? Timestamp.fromDate(reconstructedPhases.lutealPhaseStart) as any : null,
      lutealPhaseEnd: reconstructedPhases.lutealPhaseEnd ? Timestamp.fromDate(reconstructedPhases.lutealPhaseEnd) as any : null,
      nextMenstrualPhaseStart: reconstructedPhases.nextMenstrualPhaseStart ? Timestamp.fromDate(reconstructedPhases.nextMenstrualPhaseStart) as any : null,
      nextMenstrualPhaseEnd: reconstructedPhases.nextMenstrualPhaseEnd ? Timestamp.fromDate(reconstructedPhases.nextMenstrualPhaseEnd) as any : null,
      isPredictedOvulation: !currentCycle.ovulationDetectedDate,

      createdAt: Timestamp.now() as any,
    };

    await addDoc(collection(db, 'cycleHistory'), historyEntry);
  },

  // Record period start and end
  async recordPeriodStart(
    userId: string, 
    startDate: Date, 
    endDate?: Date, 
    schedule?: string,
    cycleLength?: number,
    typicalPeriodLength?: number
  ): Promise<void> {
    // 1. Overlap Prevention: Ensure new cycle isn't starting too soon after the last one
    const profile = await this.getTrackerProfile(userId);
    if (profile?.lastPeriodDate) {
      const lastStart = normalizeDate(profile.lastPeriodDate);
      const daysSinceLastStart = daysBetween(lastStart, normalizeDate(startDate));
      if (daysSinceLastStart < MIN_CYCLE_LENGTH_FOR_ARCHIVE) {
        throw new Error(`Collision Detected: A new cycle cannot start only ${daysSinceLastStart} days after your last period (Min ${MIN_CYCLE_LENGTH_FOR_ARCHIVE} days).`);
      }
    }

    // 2. Archive the current cycle before we overwrite it
    await this.archiveCurrentCycle(userId, startDate);

    // Update Profile with preferences if provided
    if (cycleLength || typicalPeriodLength) {
      await updateDoc(doc(db, 'trackerProfiles', userId), {
        ...(cycleLength && { cycleLengthDays: cycleLength }),
        ...(typicalPeriodLength && { typicalPeriodLengthDays: typicalPeriodLength }),
        updatedAt: new Date(),
      });
    }

    // 3. Get profile to access typical cycle length
    const freshProfile = await this.getTrackerProfile(userId);
    const cycleLengthDays = freshProfile?.cycleLengthDays || 28;
    
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


    // 4. Calculate predicted next period date based on cycle length
    const predictedNextPeriodDate = addDays(normalizedStartDate, cycleLengthDays);

    // 5. Calculate phase dates for UI rendering using the authoritative utility
    const phaseDates = calculatePhaseDates(
      normalizedStartDate,
      null, // No ovulation detected yet when period starts
      cycleLengthDays,
      predictedNextPeriodDate,
      normalizedEndDate
    );

    // 6. Save EVERYTHING to CycleData (Full Sync)
    const normalizedCycleData: CycleData = {
      userId,
      lastPeriodDate: normalizedStartDate,
      periodEndDate: normalizedEndDate || null,
      nextPeriodDate: normalizeDate(predictedNextPeriodDate),
      // Comprehensive phase storage
      menstrualPhaseStart: phaseDates.menstrualPhaseStart ? normalizeDate(phaseDates.menstrualPhaseStart) : null,
      menstrualPhaseEnd: phaseDates.menstrualPhaseEnd ? normalizeDate(phaseDates.menstrualPhaseEnd) : null,
      follicularPhaseStart: phaseDates.follicularPhaseStart ? normalizeDate(phaseDates.follicularPhaseStart) : null,
      follicularPhaseEnd: phaseDates.follicularPhaseEnd ? normalizeDate(phaseDates.follicularPhaseEnd) : null,
      ovulationPhaseStart: phaseDates.ovulationPhaseStart ? normalizeDate(phaseDates.ovulationPhaseStart) : null,
      ovulationPhaseEnd: phaseDates.ovulationPhaseEnd ? normalizeDate(phaseDates.ovulationPhaseEnd) : null,
      lutealPhaseStart: phaseDates.lutealPhaseStart ? normalizeDate(phaseDates.lutealPhaseStart) : null,
      lutealPhaseEnd: phaseDates.lutealPhaseEnd ? normalizeDate(phaseDates.lutealPhaseEnd) : null,
      nextMenstrualPhaseStart: phaseDates.nextMenstrualPhaseStart ? normalizeDate(phaseDates.nextMenstrualPhaseStart) : null,
      nextMenstrualPhaseEnd: phaseDates.nextMenstrualPhaseEnd ? normalizeDate(phaseDates.nextMenstrualPhaseEnd) : null,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'cycleData', userId), normalizedCycleData);

    // 7. Update tracker profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      nextPeriodDate: normalizeDate(predictedNextPeriodDate),
      updatedAt: new Date(),
    });
  },

  // Update current cycle dates WITHOUT archiving (Linked Correction)
  async updateCurrentCyclePeriod(userId: string, newStartDate: Date, newEndDate?: Date): Promise<void> {
    const trackerProfile = await this.getTrackerProfile(userId);
    const cycleLengthDays = trackerProfile?.cycleLengthDays || 28;
    
    // 1. Normalize and update current cycle
    const normalizedStartDate = normalizeDate(newStartDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    
    let normalizedEndDate: Date | null = null;
    if (newEndDate) {
      normalizedEndDate = normalizeDate(newEndDate);
      normalizedEndDate.setHours(0, 0, 0, 0);
    }

    const currentCycle = await this.getCycleData(userId);
    const existingOvulationDate = currentCycle?.ovulationDetectedDate ? normalizeDate(currentCycle.ovulationDetectedDate) : null;

    // Calculate current phases, PRESERVING ovulation if it exists
    let predictedNextPeriodDate: Date;
    if (existingOvulationDate) {
      predictedNextPeriodDate = addDays(existingOvulationDate, 14);
    } else {
      predictedNextPeriodDate = addDays(normalizedStartDate, cycleLengthDays);
    }

    const phaseDates = calculatePhaseDates(
      normalizedStartDate,
      existingOvulationDate,
      cycleLengthDays,
      predictedNextPeriodDate,
      normalizedEndDate || undefined
    );

    // Update Profile
    await updateDoc(doc(db, 'trackerProfiles', userId), {
      lastPeriodDate: normalizedStartDate,
      periodEndDate: normalizedEndDate,
      nextPeriodDate: predictedNextPeriodDate,
      updatedAt: new Date(),
    });

    // Update Current Cycle Data
    const updatedCycleData: Partial<CycleData> = {
      lastPeriodDate: normalizedStartDate,
      periodEndDate: normalizedEndDate,
      nextPeriodDate: normalizeDate(predictedNextPeriodDate),
      ...phaseDates,
      updatedAt: new Date(),
    };
    await updateDoc(doc(db, 'cycleData', userId), updatedCycleData);

    // 2. LINKED HISTORY CORRECTION: Update preceding cycle's end date
    const q = query(
      collection(db, 'cycleHistory'),
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
      limit(1)
    );
    const historySnap = await getDocs(q);
    
    if (!historySnap.empty) {
      const lastHistoryDoc = historySnap.docs[0];
      const lastHistoryData = lastHistoryDoc.data() as CycleHistory;
      
      const prevStartDate = normalizeDate(lastHistoryData.startDate);
      const newPrevEndDate = normalizedStartDate;
      const newPrevLength = daysBetween(prevStartDate, newPrevEndDate);

      // Clinical Guardrail: History cycle length check
      if (newPrevLength < MIN_CYCLE_LENGTH_FOR_ARCHIVE || newPrevLength > STALE_CYCLE_THRESHOLD_DAYS) {
        throw new Error(`Clinical Guardrail: This edit would make your previous cycle ${newPrevLength} days. Historical cycles must be between 21 and 55 days.`);
      }

      // 3. CLINICAL RESET: Trigger if start date changes and affects previous manual data
      const historyOvulationDate = lastHistoryData.ovulationDate 
        ? (lastHistoryData.ovulationDate instanceof Date ? lastHistoryData.ovulationDate : (lastHistoryData.ovulationDate as any).toDate()) 
        : null;
      
      const hasManualOvulation = !!historyOvulationDate && !lastHistoryData.isPredictedOvulation;
      // Date conversion safety for Firestore
      const lastPeriodField = currentCycle?.lastPeriodDate;
      const currentCycleStartDate = lastPeriodField instanceof Date 
        ? lastPeriodField 
        : (lastPeriodField as any)?.toDate?.() || null;

      const isStartDateChanged = currentCycleStartDate && normalizedStartDate.getTime() !== currentCycleStartDate.getTime();
      
      // If start date changed and there's manual data, we trigger a Hard Reset (Override)
      const isOverridingManual = isStartDateChanged && hasManualOvulation;

      if (isOverridingManual || (currentCycleStartDate && normalizedStartDate.getTime() !== currentCycleStartDate.getTime())) {
         // Wipe current cycle logs if start date changed
         await this.deleteCurrentCycleLogs(userId, normalizedStartDate);
         
         if (isOverridingManual) {
            // CRITICAL: Scrub historical logs from the START of the previous cycle
            // This ensures a total clinical reset for the "butchered" period
            await this.deleteCurrentCycleLogs(userId, prevStartDate);
         }
      }

      // Re-reconstruct phases for the past cycle with the updated end date
      const historicalPhases = calculatePhaseDates(
        prevStartDate,
        isOverridingManual ? null : (historyOvulationDate ? normalizeDate(historyOvulationDate) : null),
        cycleLengthDays,
        newPrevEndDate,
        null 
      );

      await updateDoc(lastHistoryDoc.ref, {
        endDate: Timestamp.fromDate(newPrevEndDate),
        cycleLength: newPrevLength,
        ...historicalPhases,
        isPredictedOvulation: isOverridingManual ? true : lastHistoryData.isPredictedOvulation,
        updatedAt: Timestamp.now()
      });
    }

    // 4. Update Rolling Average (if period ends are provided)
    if (normalizedEndDate) {
       await this.updateAdaptivePeriodLength(userId);
    }
  },
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

  // Listen for cycle history
  onCycleHistoryChange(userId: string, callback: (history: CycleHistory[]) => void): () => void {
    const q = query(
      collection(db, 'cycleHistory'),
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
      limit(12) // Keep last year of cycles
    );

    return onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as any[] as CycleHistory[];
      callback(history);
    }, (error) => {
      console.error("Error listening to cycle history:", error);
      callback([]);
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
    const trackerDocRef = doc(db, 'trackerProfiles', userId);
    await updateDoc(trackerDocRef, {
      trackedSymptoms: symptoms,
      updatedAt: new Date(),
    });
  },

  // ADAPTIVE SETTINGS: 3-Cycle Rolling Average for Period Length
  async updateAdaptivePeriodLength(userId: string): Promise<void> {
    const q = query(
      collection(db, 'cycleHistory'),
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
      limit(3)
    );
    
    try {
      const snap = await getDocs(q);
      if (snap.empty) return;

      const lengths: number[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as CycleHistory;
        if (data.menstrualPhaseStart && data.menstrualPhaseEnd) {
           const start = normalizeDate(data.menstrualPhaseStart);
           const end = normalizeDate(data.menstrualPhaseEnd);
           lengths.push(daysBetween(start, end) + 1); 
        }
      });

      if (lengths.length > 0) {
        const average = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
        // Biological bounds Check (2–10 days)
        if (average >= 2 && average <= 10) {
          await updateDoc(doc(db, 'trackerProfiles', userId), {
            typicalPeriodLengthDays: average,
            updatedAt: Timestamp.now()
          });
        }
      }
    } catch (error) {
      console.error("Error updating adaptive period length:", error);
    }
  }
};
