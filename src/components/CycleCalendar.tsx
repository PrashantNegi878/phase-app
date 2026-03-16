import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Info } from 'lucide-react';
import { CycleData } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';

interface CycleCalendarProps {
  cycleData: CycleData;
  cycleLengthDays?: number;
  onClose: () => void;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  menstrual: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-400' },
  follicular: { bg: 'bg-sage-100', text: 'text-sage-700', border: 'border-sage-200', dot: 'bg-sage-500' },
  ovulation: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  luteal: { bg: 'bg-earth-200', text: 'text-earth-700', border: 'border-earth-300', dot: 'bg-earth-500' },
  'extended-follicular': { bg: 'bg-sage-50', text: 'text-sage-600', border: 'border-sage-200', dot: 'bg-sage-400' },
  future: { bg: 'bg-earth-50', text: 'text-earth-400', border: 'border-earth-200', dot: 'bg-earth-300' },
};

const formatCalendarDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

export function CycleCalendar({ cycleData, cycleLengthDays = 28, onClose }: CycleCalendarProps) {
  const todayPhase = useMemo(() => {
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    let phase = 'future';

    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) phase = 'menstrual';
    }
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextMenstrualStart && today <= nextMenstrualEnd) phase = 'menstrual';
    }
    if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
      const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
      const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
      if (today >= follicularStart && today <= follicularEnd && phase === 'future') phase = 'follicular';
    }
    if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
      const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
      const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
      if (today >= ovulationStart && today <= ovulationEnd && phase === 'future') phase = 'ovulation';
    }
    if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
      const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
      const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
      if (today >= lutealStart && today <= lutealEnd && phase === 'future') phase = 'luteal';
    }
    if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
      const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
      const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
      if (today >= extendedStart && today <= extendedEnd && phase === 'future') phase = 'extended-follicular';
    }

    if (phase === 'future') {
      if (cycleData.ovulationDetectedDate) {
        const ovulationDate = normalizeDate(cycleData.ovulationDetectedDate);
        const ovDay = calculateDayOfCycleForDate(ovulationDate, lastPeriod);
        if (dayOfCycle <= 5) phase = 'menstrual';
        else if (dayOfCycle > 5 && dayOfCycle < ovDay) phase = 'follicular';
        else if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) phase = 'ovulation';
        else if (dayOfCycle >= ovDay + 3) phase = 'luteal';
      } else {
        const expectedOvulationDay = Math.round(28 / 2);
        if (dayOfCycle <= 5) phase = 'menstrual';
        else if (dayOfCycle > 5 && dayOfCycle < expectedOvulationDay) phase = 'follicular';
        else if (dayOfCycle >= expectedOvulationDay && dayOfCycle < expectedOvulationDay + 3) phase = 'ovulation';
        else if (dayOfCycle >= expectedOvulationDay + 3 && dayOfCycle <= expectedOvulationDay + 16) phase = 'luteal';
        else if (dayOfCycle > expectedOvulationDay + 16 && dayOfCycle >= 20) phase = 'extended-follicular';
        else if (dayOfCycle > expectedOvulationDay + 16) phase = 'follicular';
      }
    }
    return phase;
  }, [cycleData, cycleData.lastPeriodDate, cycleData.ovulationDetectedDate, cycleData.nextMenstrualPhaseEnd]);

  const calendarDays = useMemo(() => {
    const days: Array<{
      day: number;
      phase: string;
      isToday: boolean;
      isPastCycle: boolean;
      date: Date;
    }> = [];

    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const nextPeriod = cycleData.nextPeriodDate ? normalizeDate(cycleData.nextPeriodDate) : null;

    let endDate: Date;
    if (cycleData.nextMenstrualPhaseEnd) {
      endDate = normalizeDate(cycleData.nextMenstrualPhaseEnd);
    } else if (nextPeriod) {
      endDate = nextPeriod;
    } else {
      endDate = new Date(lastPeriod);
      endDate.setDate(endDate.getDate() + Math.ceil(cycleLengthDays * 1.5));
    }

    let currentDate = new Date(lastPeriod);
    let day = 1;

    while (currentDate <= endDate) {
      const isToday = currentDate.toDateString() === today.toDateString();
      let phase = 'future';

      if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
        const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
        const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
        if (currentDate >= menstrualStart && currentDate <= menstrualEnd) phase = 'menstrual';
      }
      if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
        const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
        const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
        if (currentDate >= nextMenstrualStart && currentDate <= nextMenstrualEnd) phase = 'menstrual';
      }
      if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
        const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
        const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
        if (currentDate >= follicularStart && currentDate <= follicularEnd) phase = 'follicular';
      }
      if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
        const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
        const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
        if (currentDate >= ovulationStart && currentDate <= ovulationEnd) phase = 'ovulation';
      }
      if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
        const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
        const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
        if (currentDate >= lutealStart && currentDate <= lutealEnd) phase = 'luteal';
      }
      if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
        const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
        const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
        if (currentDate >= extendedStart && currentDate <= extendedEnd) phase = 'extended-follicular';
      }

      days.push({
        day,
        phase,
        isToday,
        isPastCycle: currentDate < today,
        date: new Date(currentDate),
      });

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      day++;
    }
    return days;
  }, [cycleData, cycleData.lastPeriodDate, cycleData.ovulationDetectedDate, cycleData.nextPeriodDate, cycleLengthDays]);

  const currentDayOfCycle = useMemo(() => {
    if (!cycleData.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData.lastPeriodDate]);

  const buttonTap = { scale: 0.97 };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-soft-lg"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-earth-100 flex items-center justify-between p-6 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-sage-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Cycle Calendar</h2>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={buttonTap}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { phase: 'menstrual', label: 'Menstrual' },
              { phase: 'follicular', label: 'Follicular' },
              { phase: 'ovulation', label: 'Ovulation' },
              { phase: 'luteal', label: 'Luteal' },
            ].map(({ phase, label }) => (
              <div key={phase} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${PHASE_COLORS[phase].dot}`} />
                <span className="text-sm text-slate-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Cycle Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-earth-100">
            <div className="bg-sage-50 rounded-xl p-4">
              <div className="text-xs text-earth-500 mb-1">Current Phase</div>
              <div className="text-lg font-semibold text-sage-700 capitalize">
                {todayPhase.replace('-', ' ')}
              </div>
            </div>
            <div className="bg-sage-50 rounded-xl p-4">
              <div className="text-xs text-earth-500 mb-1">Day of Cycle</div>
              <div className="text-lg font-semibold text-sage-700">
                Day {currentDayOfCycle}
              </div>
            </div>
            {cycleData.nextPeriodDate && (
              <div className="bg-rose-50 rounded-xl p-4 col-span-2 sm:col-span-1">
                <div className="text-xs text-earth-500 mb-1">Next Period</div>
                <div className="text-lg font-semibold text-rose-600">
                  {formatDateForDisplay(cycleData.nextPeriodDate)}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-earth-500 py-2">
                {day}
              </div>
            ))}

            {calendarDays.map((item, idx) => {
              const colors = PHASE_COLORS[item.phase] || PHASE_COLORS.future;
              const dayOfMonth = item.date.getDate();

              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-xl border
                    ${colors.bg} ${colors.border}
                    ${item.isToday ? 'ring-2 ring-sage-500 ring-offset-2 shadow-soft' : ''}
                    transition-all cursor-default
                  `}
                >
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {dayOfMonth}
                  </div>
                  <div className="text-[10px] text-earth-400 mt-0.5 hidden sm:block">
                    {formatCalendarDate(item.date).split(' ')[1]}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Today Indicator */}
          <div className="mt-6 bg-sage-50 border border-sage-200 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-sage-700">
              The day with a ring indicates today. Colors represent different cycle phases.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
