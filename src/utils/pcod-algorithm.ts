import { DailyLog, CyclePhase } from '../types';
import { calculateDayOfCycle, calculateDayOfCycleForDate, normalizeDate } from './dateUtils';
import { STALE_CYCLE_THRESHOLD_DAYS, OVULATION_WINDOW_START_DAY, OVULATION_WINDOW_END_DAY } from '../constants/cycle';

export interface CyclePhaseResult {
  phase: CyclePhase;
  ovulationDetectedDate?: Date;
  nextPeriodDate: Date | null;
  dayOfCycle: number;
  additionalMessage?: string; // Message to show user after symptom logging
}

/**
 * PCOD Algorithm: Symptom-based cycle prediction
 * Weighted scoring system for irregular cycles
 */

export function calculateSymptomScore(symptoms: any): number {
  let score = 0;

  // Egg-White Cervical Fluid: 5 points (strongest indicator)
  if (symptoms.cervicalFluid === 'egg-white') {
    score += 5;
  }

  // Basal Body Temperature spike: 1-2 points
  if (symptoms.bbt && symptoms.bbt > 36.8) {
    score += 2;
  }

  // Ovulation pain/Cramps: 1 point
  if (symptoms.cramps && symptoms.cramps !== 'none') {
    score += 1;
  }

  // Mood changes: 0.5 points (subtle)
  if (symptoms.mood && ['anxious', 'irritable', 'happy'].includes(symptoms.mood)) {
    score += 0.5;
  }

  return score;
}


export function calculateCyclePhase(
  logs: DailyLog[],
  lastPeriodDate: Date | null
): CyclePhaseResult {
  if (!lastPeriodDate || logs.length === 0) {
    return {
      phase: 'pending',
      nextPeriodDate: null,
      dayOfCycle: 0,
    };
  }

  // Sort logs by date
  const sortedLogs = logs.sort((a, b) => normalizeDate(a.date).getTime() - normalizeDate(b.date).getTime());

  // Filter logs to only include those from the current cycle or very recent past
  // This prevents old logs from interfering with current cycle predictions
  const today = new Date();
  const recentLogs = sortedLogs.filter(log => {
    const logDate = normalizeDate(log.date);
    // Include logs from the current cycle (on or after lastPeriodDate)
    // and logs up to 60 days before today (to catch potential late ovulation from previous cycle if lastPeriodDate is very recent)
    return logDate >= lastPeriodDate || (today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24) <= 60;
  });

  // Calculate day of cycle using the centralized helper function
  const dayOfCycle = calculateDayOfCycle(lastPeriodDate);

  // Check for ovulation detection (score >= 6)
  let ovulationDetectedDate: Date | undefined;
  let nextPeriodDate: Date | null = null;
  let highScoreOutsideWindow = false; // score >=7 but outside 10-35

  // Check for ovulation in recent logs
  for (const log of recentLogs) {
    if (log.symptomScore >= 6 && !ovulationDetectedDate) {
      const logDayOfCycle = calculateDayOfCycleForDate(log.date, lastPeriodDate);
      
      // ONLY consider symptoms from the CURRENT cycle (logDayOfCycle > 0)
      // and within the reasonable ovulation window for PCOD
      if (logDayOfCycle >= OVULATION_WINDOW_START_DAY && logDayOfCycle <= OVULATION_WINDOW_END_DAY) {
        ovulationDetectedDate = normalizeDate(log.date);
        // Forecast next period exactly 14 days after ovulation
        nextPeriodDate = new Date(ovulationDetectedDate);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + 14);
        break;
      } else if (log.symptomScore >= 6) {
        // High confidence score but outside the expected window
        highScoreOutsideWindow = true;
      }
    }
  }

  // Determine phase
  let phase: CyclePhase = 'follicular';

  if (dayOfCycle <= 5) {
    phase = 'menstrual';
  } else if (ovulationDetectedDate) {
    const ovDay = calculateDayOfCycleForDate(ovulationDetectedDate, lastPeriodDate);
    if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) {
      phase = 'ovulation';
    } else if (dayOfCycle >= ovDay + 3) {
      phase = 'luteal';
    } else {
      phase = 'follicular';
    }
  } else if (dayOfCycle > 20 && !nextPeriodDate) {
    // No ovulation detected and cycle is extended
    // Check if it's significantly overdue (Out of Sync)
    if (dayOfCycle > STALE_CYCLE_THRESHOLD_DAYS) {
      phase = 'out-of-cycle';
    } else {
      phase = 'extended-follicular';
    }
    nextPeriodDate = null;
  } else {
    phase = 'follicular';
  }

  // Build an optional message for the logging UI
  const additionalMessage = highScoreOutsideWindow
    ? `Your symptoms are strong (Day ${dayOfCycle}), but outside the typical ovulation window (Days ${OVULATION_WINDOW_START_DAY}–${OVULATION_WINDOW_END_DAY}). Keep logging!`
    : undefined;

  return {
    phase,
    ovulationDetectedDate,
    nextPeriodDate,
    dayOfCycle,
    additionalMessage,
  };
}
