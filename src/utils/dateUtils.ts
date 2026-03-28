/**
 * Centralized date utilities for consistent date handling across the application
 */

/**
 * Get the current date with time set to start of day (00:00:00)
 * This ensures consistent "today" calculations across all components
 */
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get yesterday's date with time set to start of day
 */
export function getYesterday(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}

/**
 * Normalize any date input to a consistent Date object
 * Handles Firestore timestamps, strings, and Date objects
 */
export function normalizeDate(date: Date | string | any): Date {
  if (!date) return getToday();
  
  if (typeof date === 'string') {
    return new Date(date);
  } else if (date && typeof date === 'object' && 'seconds' in date) {
    // Firestore Timestamp
    return new Date(date.seconds * 1000);
  } else if (date instanceof Date) {
    return date;
  } else {
    return getToday();
  }
}

/**
 * Format date for date input field (YYYY-MM-DD format)
 * Uses local timezone to avoid UTC conversion issues
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate phase date ranges based on cycle data
 */
export function calculatePhaseDates(
  lastPeriodDate: Date | null,
  ovulationDetectedDate: Date | null,
  cycleLengthDays: number = 28,
  nextPeriodDate?: Date | null,
  periodEndDate?: Date | null
): {
  menstrualPhaseStart: Date | null;
  menstrualPhaseEnd: Date | null;
  follicularPhaseStart: Date | null;
  follicularPhaseEnd: Date | null;
  ovulationPhaseStart: Date | null;
  ovulationPhaseEnd: Date | null;
  lutealPhaseStart: Date | null;
  lutealPhaseEnd: Date | null;
  extendedFollicularPhaseStart: Date | null;
  extendedFollicularPhaseEnd: Date | null;
  nextMenstrualPhaseStart: Date | null;
  nextMenstrualPhaseEnd: Date | null;
} {
  if (!lastPeriodDate) {
    return {
      menstrualPhaseStart: null,
      menstrualPhaseEnd: null,
      follicularPhaseStart: null,
      follicularPhaseEnd: null,
      ovulationPhaseStart: null,
      ovulationPhaseEnd: null,
      lutealPhaseStart: null,
      lutealPhaseEnd: null,
      extendedFollicularPhaseStart: null,
      extendedFollicularPhaseEnd: null,
      nextMenstrualPhaseStart: null,
      nextMenstrualPhaseEnd: null,
    };
  }

  const lastPeriod = normalizeDate(lastPeriodDate);
  const nextPeriod = nextPeriodDate ? normalizeDate(nextPeriodDate) : addDays(lastPeriod, cycleLengthDays);
  
  // 1. Menstrual Phase (Day 1 to End of bleeding)
  const menstrualPhaseStart = new Date(lastPeriod);
  const menstrualPhaseEnd = periodEndDate ? normalizeDate(periodEndDate) : addDays(lastPeriod, 4);

  // 2. Determine Ovulation Point
  let ovulationDate: Date;
  if (ovulationDetectedDate) {
    ovulationDate = normalizeDate(ovulationDetectedDate);
  } else {
    // Predicted ovulation: approx middle of cycle
    const expectedOvulationDay = Math.round(cycleLengthDays / 2);
    ovulationDate = addDays(lastPeriod, expectedOvulationDay - 1);
  }

  // 3. Ovulation Phase (3 days: Ovulation Day + 2 days after)
  const ovulationPhaseStart = new Date(ovulationDate);
  const ovulationPhaseEnd = addDays(ovulationDate, 2);

  // 4. Follicular Phase (Starts after period, ends before ovulation)
  const follicularPhaseStart = addDays(menstrualPhaseEnd, 1);
  const follicularPhaseEnd = addDays(ovulationPhaseStart, -1);

  // 5. Luteal Phase (Starts after ovulation, ends at next period)
  const lutealPhaseStart = addDays(ovulationPhaseEnd, 1);
  const lutealPhaseEnd = addDays(nextPeriod, -1);

  // 6. Next Menstrual Phase
  const nextMenstrualPhaseStart = new Date(nextPeriod);
  const nextMenstrualPhaseEnd = addDays(nextPeriod, 4);

  // Return all phases (keeping legacy field names for DB compatibility)
  return {
    menstrualPhaseStart,
    menstrualPhaseEnd,
    follicularPhaseStart: follicularPhaseStart > follicularPhaseEnd ? null : follicularPhaseStart,
    follicularPhaseEnd: follicularPhaseStart > follicularPhaseEnd ? null : follicularPhaseEnd,
    ovulationPhaseStart,
    ovulationPhaseEnd,
    lutealPhaseStart,
    lutealPhaseEnd,
    extendedFollicularPhaseStart: null, // Simplified: no longer used
    extendedFollicularPhaseEnd: null,
    nextMenstrualPhaseStart,
    nextMenstrualPhaseEnd,
  };
}

/**
 * Parse date from input field value
 */
export function parseDateFromInput(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.toDateString() === d2.toDateString();
}

/**
 * Calculate days between two dates (ignoring time)
 */
export function daysBetween(startDate: Date | null, endDate: Date | null): number {
  if (!startDate || !endDate) return 0;
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display in DD/MM/YYYY format
 */
export function formatDateForDisplay(date: Date | null): string {
  if (!date) return '';
  const d = normalizeDate(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Helper function to calculate day of cycle consistently
 * Returns the current day of cycle based on last period start date
 */
export function calculateDayOfCycle(lastPeriodDate: Date | null): number {
  if (!lastPeriodDate) return 0;
  
  const today = getToday();
  const lastPeriod = normalizeDate(lastPeriodDate);
  
  // Calculate days since last period start
  const daysSinceStart = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  // Return day of cycle (1-based, not 0-based)
  return daysSinceStart + 1;
}

/**
 * Calculate day of cycle for a specific date
 * Used to determine which day of cycle a log entry represents
 */
export function calculateDayOfCycleForDate(logDate: Date, lastPeriodDate: Date | null): number {
  if (!lastPeriodDate) return 0;
  
  const log = normalizeDate(logDate);
  const lastPeriod = normalizeDate(lastPeriodDate);
  
  // Calculate days since last period start
  const daysSinceStart = Math.floor((log.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
  
  // Return day of cycle (1-based, not 0-based)
  return daysSinceStart + 1;
}
