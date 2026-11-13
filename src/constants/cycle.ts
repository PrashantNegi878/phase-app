/**
 * Clinical Thresholds & Cycle Management Constants
 */

// The maximum number of days a cycle can extend before being considered "Stale" or "Out of Sync".
// 55 days is approximately 8 weeks, which is the standard clinical threshold for a missed cycle alarm.
export const STALE_CYCLE_THRESHOLD_DAYS = 55;

// Standard Luteal Phase length used for retrospective reconstruction when no symptoms are logged.
export const STANDARD_LUTEAL_PHASE_DAYS = 14;

// Absolute minimum cycle length — hard block below this (clinically, cycles under 10 days are physiologically implausible).
export const MIN_ABSOLUTE_CYCLE_LENGTH = 10;

// Minimum cycle length for a valid entry in history (prevents duplicates or accidental logs).
// Cycles shorter than this will show a soft warning but are still allowed.
export const MIN_CYCLE_LENGTH_FOR_ARCHIVE = 21;

// The minimum number of days allowed for a "Typical Cycle Length" setting.
export const MIN_TYPICAL_CYCLE_LENGTH = 21;

// The maximum number of days allowed for a "Typical Cycle Length" setting.
export const MAX_TYPICAL_CYCLE_LENGTH = 55;

// The clinical window (Days since last period) where ovulation symptoms are considered valid.
export const OVULATION_WINDOW_START_DAY = 10;
export const OVULATION_WINDOW_END_DAY = 35;
