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
  
  // Menstrual phase
  const menstrualPhaseStart = new Date(lastPeriod);
  const menstrualPhaseEnd = periodEndDate ? new Date(normalizeDate(periodEndDate)) : new Date(lastPeriod);
  if (!periodEndDate) {
    menstrualPhaseEnd.setDate(menstrualPhaseEnd.getDate() + 4); // Default to Day 5 (Start + 4) if no end date
  }
  
  // If nextPeriodDate is provided, also calculate the next menstrual phase
  let nextMenstrualPhaseStart: Date | null = null;
  let nextMenstrualPhaseEnd: Date | null = null;
  
  if (nextPeriodDate) {
    const nextPeriod = normalizeDate(nextPeriodDate);
    nextMenstrualPhaseStart = new Date(nextPeriod);
    nextMenstrualPhaseEnd = new Date(nextPeriod);
    nextMenstrualPhaseEnd.setDate(nextMenstrualPhaseEnd.getDate() + 4); // Day 5 of next cycle
  }

  // Follicular phase starts after menstrual
  let follicularPhaseStart: Date | null = new Date(menstrualPhaseEnd);
  follicularPhaseStart.setDate(follicularPhaseStart.getDate() + 1); // Day after period ends

  let follicularPhaseEnd: Date | null = null;
  let ovulationPhaseStart: Date;
  let ovulationPhaseEnd: Date;
  let lutealPhaseStart: Date;
  let lutealPhaseEnd: Date;
  let extendedFollicularPhaseStart: Date | null = null;
  let extendedFollicularPhaseEnd: Date | null = null;

  if (ovulationDetectedDate) {
    // Use actual ovulation date
    const ovulationDate = normalizeDate(ovulationDetectedDate);
    

    // Follicular phase ends before ovulation
    follicularPhaseEnd = new Date(ovulationDate);
    follicularPhaseEnd.setDate(follicularPhaseEnd.getDate() - 1); // Day before ovulation

    // Ovulation phase: 3 days (ovulation day + 2 days after)
    ovulationPhaseStart = new Date(ovulationDate);
    ovulationPhaseEnd = new Date(ovulationDate);
    ovulationPhaseEnd.setDate(ovulationPhaseEnd.getDate() + 2); // 3 days total

    // Luteal phase: starts from day 3 after ovulation
    lutealPhaseStart = new Date(ovulationDate);
    lutealPhaseStart.setDate(lutealPhaseStart.getDate() + 3); // Day 3 after ovulation

    // Luteal phase should end when next period starts, or 14 days after ovulation if no next period date
    if (nextPeriodDate) {
      const nextPeriod = normalizeDate(nextPeriodDate);
      // Luteal phase ends the day before next period
      lutealPhaseEnd = new Date(nextPeriod);
      lutealPhaseEnd.setDate(lutealPhaseEnd.getDate() - 1);
    } else {
      // Default: 14 days after ovulation
      lutealPhaseEnd = new Date(ovulationDate);
      lutealPhaseEnd.setDate(lutealPhaseEnd.getDate() + 16); // 14 days total
    }

    // Check for extended follicular phase (when cycle is longer than normal)
    // Extended follicular phase replaces normal follicular phase in long cycles
    const nextCycleStart = nextPeriodDate ? normalizeDate(nextPeriodDate) : new Date(lastPeriod);
    if (!nextPeriodDate) {
      nextCycleStart.setDate(nextCycleStart.getDate() + cycleLengthDays);
    }
    
    // Calculate if we need extended follicular phase instead of normal follicular phase
    const cycleLength = Math.floor((nextCycleStart.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedCycleLength = cycleLengthDays;
    
    if (cycleLength > expectedCycleLength + 5) { // If cycle is significantly longer than expected
      // Use extended follicular phase instead of normal follicular phase
      extendedFollicularPhaseStart = new Date(follicularPhaseStart);
      extendedFollicularPhaseEnd = new Date(lutealPhaseStart);
      extendedFollicularPhaseEnd.setDate(extendedFollicularPhaseEnd.getDate() - 1);
      
      // Normal follicular phase doesn't exist in extended cycles
      follicularPhaseStart = null;
      follicularPhaseEnd = null;
    }
  } else {
    // Use predicted ovulation (middle of cycle)
    const expectedOvulationDay = Math.round(cycleLengthDays / 2);
    const expectedOvulationDate = new Date(lastPeriod);
    expectedOvulationDate.setDate(expectedOvulationDate.getDate() + expectedOvulationDay - 1); // -1 because day 1 is lastPeriod

    // Follicular phase ends before predicted ovulation
    follicularPhaseEnd = new Date(expectedOvulationDate);
    follicularPhaseEnd.setDate(follicularPhaseEnd.getDate() - 1); // Day before ovulation

    // Ovulation phase: 3 days (expected ovulation day + 2 days after)
    ovulationPhaseStart = new Date(expectedOvulationDate);
    ovulationPhaseEnd = new Date(expectedOvulationDate);
    ovulationPhaseEnd.setDate(ovulationPhaseEnd.getDate() + 2); // 3 days total

    // Luteal phase: starts from day 3 after expected ovulation
    lutealPhaseStart = new Date(expectedOvulationDate);
    lutealPhaseStart.setDate(lutealPhaseStart.getDate() + 3); // Day 3 after ovulation

    // Luteal phase should end when next period starts, or 14 days after ovulation if no next period date
    if (nextPeriodDate) {
      const nextPeriod = normalizeDate(nextPeriodDate);
      // Luteal phase ends the day before next period
      lutealPhaseEnd = new Date(nextPeriod);
      lutealPhaseEnd.setDate(lutealPhaseEnd.getDate() - 1);
    } else {
      // Default: 14 days after ovulation
      lutealPhaseEnd = new Date(expectedOvulationDate);
      lutealPhaseEnd.setDate(lutealPhaseEnd.getDate() + 16); // 14 days total
    }

    // Check for extended follicular phase (when cycle is longer than normal)
    // Extended follicular phase replaces normal follicular phase in long cycles
    const nextCycleStart = nextPeriodDate ? normalizeDate(nextPeriodDate) : new Date(lastPeriod);
    if (!nextPeriodDate) {
      nextCycleStart.setDate(nextCycleStart.getDate() + cycleLengthDays);
    }
    
    // Calculate if we need extended follicular phase instead of normal follicular phase
    const cycleLength = Math.floor((nextCycleStart.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedCycleLength = cycleLengthDays;
    
    if (cycleLength > expectedCycleLength + 5) { // If cycle is significantly longer than expected
      // Use extended follicular phase instead of normal follicular phase
      extendedFollicularPhaseStart = new Date(follicularPhaseStart);
      extendedFollicularPhaseEnd = new Date(lutealPhaseStart);
      extendedFollicularPhaseEnd.setDate(extendedFollicularPhaseEnd.getDate() - 1);
      
      // Normal follicular phase doesn't exist in extended cycles
      follicularPhaseStart = null;
      follicularPhaseEnd = null;
    }
  }

  return {
    menstrualPhaseStart,
    menstrualPhaseEnd,
    follicularPhaseStart,
    follicularPhaseEnd,
    ovulationPhaseStart,
    ovulationPhaseEnd,
    lutealPhaseStart,
    lutealPhaseEnd,
    extendedFollicularPhaseStart,
    extendedFollicularPhaseEnd,
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
