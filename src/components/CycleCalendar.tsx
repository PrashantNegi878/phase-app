import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { CycleData } from '../types';
import { getToday, normalizeDate, formatDateForDisplay, addDays } from '../utils/dateUtils';
import { STALE_CYCLE_THRESHOLD_DAYS } from '../constants/cycle';
import { PHASE_COLORS, PHASE_LABELS } from '../constants/phases';

interface CycleCalendarProps {
  cycleData: CycleData;
  cycleLengthDays?: number;
  onClose: () => void;
  isHistory?: boolean;
}

export function CycleCalendar({ cycleData, cycleLengthDays = 28, onClose, isHistory = false }: CycleCalendarProps) {
  // 1. Current Day Calculation
  const currentDayOfCycle = useMemo(() => {
    if (isHistory || !cycleData?.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData?.lastPeriodDate]);

  // 2. Comprehensive Calendar Grid Data
  const calendarDays = useMemo(() => {
    const days: Array<{
      day: number;
      phase: string;
      isToday: boolean;
      date: Date;
    }> = [];

    const today = getToday();
    const isHistoryOverride = isHistory;
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    
    // Define phase boundaries purely from synced DB fields
    const phases = [
      { start: cycleData.menstrualPhaseStart, end: cycleData.menstrualPhaseEnd, type: 'menstrual' },
      { start: cycleData.follicularPhaseStart, end: cycleData.follicularPhaseEnd, type: 'follicular' },
      { start: cycleData.ovulationPhaseStart, end: cycleData.ovulationPhaseEnd, type: 'ovulation' },
      { start: cycleData.lutealPhaseStart, end: cycleData.lutealPhaseEnd, type: 'luteal' },
    ];

    // Only show next predicted period if NOT in history mode
    if (!isHistory) {
      phases.push({ start: cycleData.nextMenstrualPhaseStart, end: cycleData.nextMenstrualPhaseEnd, type: 'period-expected' });
    }

    const fallbackDays = cycleLengthDays + 4;

    let targetDate;
    if (isHistory && cycleData.nextPeriodDate) {
      targetDate = addDays(normalizeDate(cycleData.nextPeriodDate), -1);
    } else if (cycleData.nextMenstrualPhaseEnd) {
      targetDate = normalizeDate(cycleData.nextMenstrualPhaseEnd);
    } else {
      targetDate = addDays(lastPeriod, fallbackDays);
    }

    // High Precision: Always render at least until today to ensure PCOD "Delayed Phase" is visible
    // CRITICAL: Only extend for current cycle. History should strictly stop at targetDate.
    const endDate = (isHistory || targetDate.getTime() > today.getTime())
      ? targetDate
      : addDays(today, 2); // Show a 2-day buffer into the future for active tracking

    let currentDate = new Date(lastPeriod);
    let dayNum = 1;

    while (currentDate <= endDate) {
      const isToday = !isHistoryOverride && currentDate.toDateString() === today.toDateString();
      let phase = 'future';

      // Match current date to one of the defined phases
      for (const p of phases) {
        if (p.start && p.end) {
          const start = normalizeDate(p.start);
          const end = normalizeDate(p.end);
          if (currentDate >= start && currentDate <= end) {
            phase = p.type;
            break;
          }
        }
      }

      // Handle extended state for PCOD: past typical cycle length but no bleed started
      if (phase === 'future' && dayNum > cycleLengthDays) {
        phase = dayNum > STALE_CYCLE_THRESHOLD_DAYS ? 'out-of-cycle' : 'extended-follicular';
      }

      days.push({
        day: dayNum,
        phase,
        isToday,
        date: new Date(currentDate),
      });

      currentDate.setDate(currentDate.getDate() + 1);
      dayNum++;
    }
    return days;
  }, [cycleData, cycleLengthDays]);

  // 3. Current Phase Label for Display
  const currentPhase = useMemo(() => {
    if (isHistory) return 'future';
    const todayStr = getToday().toDateString();
    const todayCell = calendarDays.find(d => d.date.toDateString() === todayStr);
    
    // Explicit stale check
    if (!todayCell || todayCell.phase === 'future') {
      const today = getToday();
      const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
      const diffDays = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays + 1 > 55) return 'out-of-cycle';
    }

    return todayCell?.phase || 'future';
  }, [calendarDays, isHistory, cycleData.lastPeriodDate]);

  // Animation Variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], staggerChildren: 0.05 }
    },
    exit: { opacity: 0, scale: 0.95, y: 20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <AnimatePresence>
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-card-bg rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-soft-lg border border-border-subtle"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card-bg border-b border-border-subtle flex items-center justify-between p-6 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-sage-600 dark:text-sage-400" />
              </div>
              <h2 className="text-xl font-semibold text-text-main">Cycle Calendar</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 dark:hover:bg-slate-700 text-text-muted hover:text-text-main transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Phase Legend */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 px-1">
              {['menstrual', 'follicular', 'ovulation', 'luteal', 
                ...(currentPhase === 'period-expected' || currentPhase === 'extended-follicular' || currentPhase === 'out-of-cycle' 
                  ? ['period-expected', 'extended-follicular'] 
                  : [])
              ].map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${PHASE_COLORS[p]?.dot || 'bg-earth-300 dark:bg-slate-600'}`} />
                  <span className="text-[11px] sm:text-xs text-text-muted font-medium whitespace-nowrap">
                    {PHASE_LABELS[p]
                      ?.replace(' Phase', '')
                      .replace('Awaiting Period', 'Expected')
                      .replace('Awaiting Log', 'Awaiting')}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Cycle Stats (Only for current cycle) */}
            {!isHistory && (
              <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 pb-6 border-b border-border-subtle">
                <div className="bg-app-bg dark:bg-slate-800/40 rounded-xl p-3 sm:p-4">
                  <div className="text-[10px] sm:text-xs text-text-muted mb-1 uppercase font-bold tracking-tight">Status</div>
                  <div className="text-base sm:text-lg font-semibold text-sage-700 dark:text-sage-400 truncate whitespace-nowrap">
                    {(PHASE_LABELS[currentPhase] || 'Pending')
                      .replace(' Phase', '')
                      .replace('Awaiting Period', 'Expected')
                      .replace('Awaiting Log', 'Awaiting')}
                  </div>
                </div>
                <div className="bg-app-bg dark:bg-slate-800/40 rounded-xl p-3 sm:p-4">
                  <div className="text-[10px] sm:text-xs text-text-muted mb-1 uppercase font-bold tracking-tight">Day of Cycle</div>
                  <div className="text-base sm:text-lg font-semibold text-sage-700 dark:text-sage-400 font-outfit whitespace-nowrap">
                    {isHistory || currentPhase !== 'out-of-cycle' ? `Day ${currentDayOfCycle}` : 'Sync Needed'}
                  </div>
                </div>
                {cycleData.nextPeriodDate && (
                  <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1 border border-rose-100 dark:border-rose-900/20">
                    <div className="text-[10px] sm:text-xs text-text-muted mb-1 uppercase font-bold tracking-tight">
                      {currentPhase === 'period-expected' 
                        ? 'Expected' 
                        : (currentPhase === 'extended-follicular' || currentPhase === 'out-of-cycle')
                          ? 'Was Expected'
                          : 'Next Period'}
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatDateForDisplay(cycleData.nextPeriodDate)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Calendar Grid */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-bold text-text-muted opacity-60 py-2 uppercase tracking-tight">
                    {day}
                  </div>
                ))}

                {/* Weekday Padding: Align first day of cycle to its actual day of the week */}
                {Array.from({ length: normalizeDate(cycleData.lastPeriodDate).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square opacity-0 pointer-events-none" />
                ))}

                {calendarDays.map((item, index) => {
                  const colors = PHASE_COLORS[item.phase] || PHASE_COLORS.future;
                  const dayOfMonth = item.date.getDate();
                  const showMonth = dayOfMonth === 1 || index === 0;

                  return (
                    <div
                      key={item.date.toISOString()}
                      className={`
                        relative aspect-square flex flex-col items-center justify-center rounded-xl border
                        ${colors.calendarBg} ${colors.border}
                        ${item.isToday ? 'ring-2 ring-sage-500 ring-offset-2' : ''}
                        transition-all duration-200
                      `}
                    >
                      <div className={`text-xs sm:text-sm font-semibold ${colors.text} z-10 ${showMonth ? '-mt-1' : ''}`}>
                        {dayOfMonth}
                      </div>
                      {showMonth && (
                        <div className="absolute bottom-1 text-[8px] text-text-muted opacity-60 font-bold uppercase tracking-tighter">
                          {item.date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}