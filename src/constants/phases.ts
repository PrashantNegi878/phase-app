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
    calendarBg: 'bg-rose-100',
    text: 'text-rose-600', 
    light: 'bg-rose-50', 
    gradient: 'from-rose-100 to-rose-50',
    dot: 'bg-rose-400',
    border: 'border-rose-200'
  },
  follicular: { 
    vibrantBg: 'bg-sage-500', 
    calendarBg: 'bg-sage-100',
    text: 'text-sage-700', 
    light: 'bg-sage-50', 
    gradient: 'from-sage-100 to-sage-50',
    dot: 'bg-sage-500',
    border: 'border-sage-200'
  },
  ovulation: { 
    vibrantBg: 'bg-amber-400', 
    calendarBg: 'bg-amber-100',
    text: 'text-amber-600', 
    light: 'bg-amber-50', 
    gradient: 'from-amber-100 to-amber-50',
    dot: 'bg-amber-400',
    border: 'border-amber-200'
  },
  luteal: { 
    vibrantBg: 'bg-earth-500', 
    calendarBg: 'bg-earth-200',
    text: 'text-earth-700', 
    light: 'bg-earth-100', 
    gradient: 'from-earth-200 to-earth-100',
    dot: 'bg-earth-500',
    border: 'border-earth-300'
  },
  'extended-follicular': { 
    vibrantBg: 'bg-sage-400', 
    calendarBg: 'bg-sage-50',
    text: 'text-sage-600', 
    light: 'bg-sage-50', 
    gradient: 'from-sage-100 to-sage-50',
    dot: 'bg-sage-400',
    border: 'border-sage-200'
  },
  'period-expected': { 
    vibrantBg: 'bg-rose-300', 
    calendarBg: 'bg-rose-50',
    text: 'text-rose-500', 
    light: 'bg-rose-50', 
    gradient: 'from-rose-50 to-white',
    dot: 'bg-rose-300',
    border: 'border-rose-100'
  },
  'out-of-cycle': { 
    vibrantBg: 'bg-earth-300', 
    calendarBg: 'bg-earth-50',
    text: 'text-earth-600', 
    light: 'bg-earth-50', 
    gradient: 'from-earth-100 to-earth-50',
    dot: 'bg-earth-300',
    border: 'border-earth-200'
  },
  future: { 
    vibrantBg: 'bg-earth-50', 
    calendarBg: 'bg-white',
    text: 'text-earth-400', 
    light: 'bg-earth-50', 
    gradient: 'from-earth-50 to-white',
    dot: 'bg-earth-300',
    border: 'border-earth-200'
  },
  pending: { 
    vibrantBg: 'bg-earth-300', 
    calendarBg: 'bg-earth-50',
    text: 'text-earth-600', 
    light: 'bg-earth-50', 
    gradient: 'from-earth-100 to-earth-50',
    dot: 'bg-earth-300',
    border: 'border-earth-200'
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
