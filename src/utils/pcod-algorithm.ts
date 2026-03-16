import { DailyLog, CyclePhase } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate } from './dateUtils';

export interface CyclePhaseResult {
  phase: CyclePhase;
  ovulationDetectedDate?: Date;
  nextPeriodDate: Date | null;
  dayOfCycle: number;
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
  const sortedLogs = logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate day of cycle using the centralized helper function
  const dayOfCycle = calculateDayOfCycle(lastPeriodDate);

  // Check for ovulation detection (score >= 6)
  let ovulationDetectedDate: Date | undefined;
  let nextPeriodDate: Date | null = null;

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    
    if (log.symptomScore >= 6 && !ovulationDetectedDate) {
      // Calculate which day of cycle this log represents
      // Use the log date as "today" and lastPeriodDate as the start
      const logDayOfCycle = calculateDayOfCycleForDate(log.date, lastPeriodDate);
      
      console.log('🔍 Checking ovulation detection:', {
        logDate: log.date,
        logDayOfCycle,
        symptomScore: log.symptomScore,
        lastPeriodDate
      });
      
      // Only consider ovulation detection if it's in the appropriate timeframe
      // Typically ovulation happens between days 10-21 of the cycle
      if (logDayOfCycle >= 10 && logDayOfCycle <= 21) {
        ovulationDetectedDate = log.date;
        // Forecast next period exactly 14 days after ovulation
        nextPeriodDate = new Date(log.date);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + 14);
        console.log('✅ Ovulation detected:', {
          date: ovulationDetectedDate,
          dayOfCycle: logDayOfCycle,
          nextPeriodDate
        });
        break;
      } else {
        console.log('❌ Ovulation not in valid timeframe:', {
          dayOfCycle: logDayOfCycle,
          validRange: '10-21'
        });
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
    phase = 'extended-follicular';
    nextPeriodDate = null;
  }

  return {
    phase,
    ovulationDetectedDate,
    nextPeriodDate,
    dayOfCycle,
  };
}
