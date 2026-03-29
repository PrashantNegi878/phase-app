/**
 * Centralized Clinical Phase Constants
 * Ensures consistency across Tracker, Partner, and Calendar views.
 */

export const PHASE_COLORS: Record<string, { 
  vibrantBg: string;   // For dashboard cards / primary buttons
  calendarBg: string;  // For calendar day cells (lighter shades)
  text: string; 
  light: string;       // Very light background for secondary UI
  gradient: string;    // For card backgrounds
  dot: string;         // For legend dots
  border: string;      // For day cell borders
}> = {
  menstrual: { 
    vibrantBg: 'bg-rose-400', 
    calendarBg: 'bg-rose-100 dark:bg-rose-800/40',
    text: 'text-rose-600 dark:text-rose-400', 
    light: 'bg-rose-50 dark:bg-rose-800/20', 
    gradient: 'from-rose-100 to-rose-50 dark:from-rose-700/80 dark:to-rose-900/60',
    dot: 'bg-rose-400',
    border: 'border-rose-200 dark:border-rose-800/50'
  },
  follicular: { 
    vibrantBg: 'bg-sage-500', 
    calendarBg: 'bg-sage-100 dark:bg-sage-900/30',
    text: 'text-sage-700 dark:text-sage-300', 
    light: 'bg-sage-50 dark:bg-sage-900/20', 
    gradient: 'from-sage-100 to-sage-50 dark:from-sage-800/40 dark:to-sage-900/20',
    dot: 'bg-sage-500',
    border: 'border-sage-200 dark:border-sage-900/50'
  },
  ovulation: { 
    vibrantBg: 'bg-amber-400', 
    calendarBg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400', 
    light: 'bg-amber-50 dark:bg-amber-900/20', 
    gradient: 'from-amber-100 to-amber-50 dark:from-amber-800/60 dark:to-amber-950/30',
    dot: 'bg-amber-400',
    border: 'border-amber-200 dark:border-amber-900/50'
  },
  luteal: { 
    vibrantBg: 'bg-earth-500', 
    calendarBg: 'bg-earth-200 dark:bg-earth-900/30',
    text: 'text-earth-700 dark:text-earth-300', 
    light: 'bg-earth-100 dark:bg-earth-900/20', 
    gradient: 'from-earth-200 to-earth-100 dark:from-earth-800/40 dark:to-earth-900/20',
    dot: 'bg-earth-500',
    border: 'border-earth-300 dark:border-earth-800/50'
  },
  'extended-follicular': { 
    vibrantBg: 'bg-sage-400', 
    calendarBg: 'bg-sage-50 dark:bg-sage-900/30',
    text: 'text-sage-600 dark:text-sage-400', 
    light: 'bg-sage-50 dark:bg-sage-900/30', 
    gradient: 'from-sage-100 to-sage-50 dark:from-sage-800/40 dark:to-sage-900/20',
    dot: 'bg-sage-400',
    border: 'border-sage-200 dark:border-sage-900/30'
  },
  'period-expected': { 
    vibrantBg: 'bg-rose-300', 
    calendarBg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-500 dark:text-rose-400/80', 
    light: 'bg-rose-50 dark:bg-rose-950/20', 
    gradient: 'from-rose-50 to-white dark:from-rose-900/30 dark:to-slate-900/60',
    dot: 'bg-rose-300',
    border: 'border-rose-100 dark:border-rose-900/30'
  },
  'out-of-cycle': { 
    vibrantBg: 'bg-earth-300', 
    calendarBg: 'bg-earth-50 dark:bg-earth-900/30',
    text: 'text-earth-600 dark:text-earth-400', 
    light: 'bg-earth-50 dark:bg-earth-900/30', 
    gradient: 'from-earth-100 to-earth-50 dark:from-earth-800/40 dark:to-earth-900/20',
    dot: 'bg-earth-300',
    border: 'border-earth-200 dark:border-earth-800/50'
  },
  future: { 
    vibrantBg: 'bg-earth-50 dark:bg-slate-800/40', 
    calendarBg: 'bg-white dark:bg-slate-900/60',
    text: 'text-earth-400 dark:text-slate-400', 
    light: 'bg-earth-50 dark:bg-slate-800/40', 
    gradient: 'from-earth-50 to-white dark:from-slate-800/40 dark:to-slate-900/20',
    dot: 'bg-earth-300 dark:bg-slate-600',
    border: 'border-earth-200 dark:border-slate-800'
  },
  pending: { 
    vibrantBg: 'bg-earth-300', 
    calendarBg: 'bg-earth-50 dark:bg-earth-900/30',
    text: 'text-earth-600 dark:text-earth-400', 
    light: 'bg-earth-50 dark:bg-earth-900/30', 
    gradient: 'from-earth-100 to-earth-50 dark:from-earth-800/40 dark:to-earth-900/20',
    dot: 'bg-earth-300',
    border: 'border-earth-200 dark:border-earth-800/50'
  },
};

export const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal Phase',
  'period-expected': 'Awaiting Period',
  'extended-follicular': 'Delayed',
  'out-of-cycle': 'Awaiting Log',
  future: 'Future',
  pending: 'Pending Data',
};
