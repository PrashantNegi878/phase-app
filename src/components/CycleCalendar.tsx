import React, { useMemo } from 'react';
import { CycleData } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';

interface CycleCalendarProps {
  cycleData: CycleData;
  cycleLengthDays?: number; // Default 28
  onClose: () => void;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  menstrual: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  follicular: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  ovulation: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  luteal: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'extended-follicular': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  future: { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' },
};

// Custom format for calendar: "1 Mar", "2 Apr", etc.
const formatCalendarDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

export function CycleCalendar({ cycleData, cycleLengthDays = 28, onClose }: CycleCalendarProps) {
  // Calculate phase dynamically based on current date and cycle data
  const todayPhase = useMemo(() => {
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    
    // Determine phase based on stored phase dates (same logic as calendar rendering)
    let phase = 'future';
    
    // Check menstrual phase (current cycle)
    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) {
        phase = 'menstrual';
      }
    }
    
    // Check menstrual phase (next cycle)
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextMenstrualStart && today <= nextMenstrualEnd) {
        phase = 'menstrual';
      }
    }
    
    // Check follicular phase
    if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
      const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
      const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
      if (today >= follicularStart && today <= follicularEnd && phase === 'future') {
        phase = 'follicular';
      }
    }
    
    // Check ovulation phase
    if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
      const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
      const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
      if (today >= ovulationStart && today <= ovulationEnd && phase === 'future') {
        phase = 'ovulation';
      }
    }
    
    // Check luteal phase
    if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
      const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
      const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
      if (today >= lutealStart && today <= lutealEnd && phase === 'future') {
        phase = 'luteal';
      }
    }
    
    // Check extended follicular phase
    if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
      const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
      const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
      if (today >= extendedStart && today <= extendedEnd && phase === 'future') {
        phase = 'extended-follicular';
      }
    }
    
    // If no phase matched, calculate based on day of cycle and ovulation detection
    if (phase === 'future') {
      if (cycleData.ovulationDetectedDate) {
        const ovulationDate = normalizeDate(cycleData.ovulationDetectedDate);
        const ovDay = calculateDayOfCycleForDate(ovulationDate, lastPeriod);
        
        if (dayOfCycle <= 5) {
          phase = 'menstrual';
        } else if (dayOfCycle > 5 && dayOfCycle < ovDay) {
          phase = 'follicular';
        } else if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) {
          phase = 'ovulation';
        } else if (dayOfCycle >= ovDay + 3) {
          phase = 'luteal';
        }
      } else {
        // No ovulation detected - use predicted phases
        const expectedOvulationDay = Math.round(28 / 2); // Default cycle length
        
        if (dayOfCycle <= 5) {
          phase = 'menstrual';
        } else if (dayOfCycle > 5 && dayOfCycle < expectedOvulationDay) {
          phase = 'follicular';
        } else if (dayOfCycle >= expectedOvulationDay && dayOfCycle < expectedOvulationDay + 3) {
          phase = 'ovulation';
        } else if (dayOfCycle >= expectedOvulationDay + 3 && dayOfCycle <= expectedOvulationDay + 16) {
          phase = 'luteal';
        } else if (dayOfCycle > expectedOvulationDay + 16 && dayOfCycle >= 20) {
          phase = 'extended-follicular';
        } else if (dayOfCycle > expectedOvulationDay + 16) {
          phase = 'follicular';
        }
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

    // Calculate the end date for the calendar - use nextMenstrualPhaseEnd if available, otherwise use nextPeriodDate
    // Include the full next menstrual phase (days 1-5 of next cycle) to show complete cycle information
    let endDate: Date;
    if (cycleData.nextMenstrualPhaseEnd) {
      endDate = normalizeDate(cycleData.nextMenstrualPhaseEnd);
    } else if (nextPeriod) {
      endDate = nextPeriod;
    } else {
      endDate = new Date(lastPeriod);
      endDate.setDate(endDate.getDate() + Math.ceil(cycleLengthDays * 1.5));
    }

    // Start from last period date and go until next period date (or calculated end date)
    let currentDate = new Date(lastPeriod);
    let day = 1;

    // Continue until we reach the end date
    while (currentDate <= endDate) {
      const isToday = currentDate.toDateString() === today.toDateString();

      // Determine phase based on stored phase dates from database
      let phase = 'future'; // Default to future

      // Check menstrual phase (current cycle)
      if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
        const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
        const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
        if (currentDate >= menstrualStart && currentDate <= menstrualEnd) {
          phase = 'menstrual';
        }
      }
      
      // Check menstrual phase (next cycle)
      if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
        const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
        const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
        if (currentDate >= nextMenstrualStart && currentDate <= nextMenstrualEnd) {
          phase = 'menstrual';
        }
      }

      // Check follicular phase
      if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
        const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
        const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
        if (currentDate >= follicularStart && currentDate <= follicularEnd) {
          phase = 'follicular';
        }
      }

      // Check ovulation phase
      if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
        const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
        const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
        if (currentDate >= ovulationStart && currentDate <= ovulationEnd) {
          phase = 'ovulation';
        }
      }

      // Check luteal phase
      if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
        const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
        const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
        if (currentDate >= lutealStart && currentDate <= lutealEnd) {
          phase = 'luteal';
        }
      }

      // Check extended follicular phase
      if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
        const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
        const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
        if (currentDate >= extendedStart && currentDate <= extendedEnd) {
          phase = 'extended-follicular';
        }
      }

      days.push({
        day,
        phase,
        isToday,
        isPastCycle: currentDate < today,
        date: currentDate,
      });

      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      day++;
    }

    return days;
  }, [cycleData, cycleData.lastPeriodDate, cycleData.ovulationDetectedDate, cycleData.nextPeriodDate, cycleLengthDays]);

  // Calculate day of cycle dynamically based on last period date
  const currentDayOfCycle = useMemo(() => {
    if (!cycleData.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    // Calculate day of cycle: today - lastPeriod + 1
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData.lastPeriodDate]);
  
  // Use stored next period date from database
  const nextPeriodDate = cycleData.nextPeriodDate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-6">
          <h2 className="text-2xl font-bold text-gray-800">Phase Calendar</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { phase: 'menstrual', label: 'Menstrual' },
              { phase: 'follicular', label: 'Follicular' },
              { phase: 'ovulation', label: 'Ovulation' },
              { phase: 'luteal', label: 'Luteal' },
            ].map(({ phase, label }) => (
              <div key={phase} className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border-2 ${PHASE_COLORS[phase].bg} ${PHASE_COLORS[phase].border}`}
                ></div>
                <span className="text-sm text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Cycle Info */}
          <div className="grid grid-cols-2 gap-4 mb-8 pb-6 border-b">
            <div>
              <div className="text-sm text-gray-500">Current Phase</div>
              <div className="text-lg font-bold text-gray-800 capitalize">
                {todayPhase}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Day of Cycle</div>
              <div className="text-lg font-bold text-gray-800">
                Day {currentDayOfCycle}
              </div>
            </div>
            {cycleData.nextPeriodDate && (
              <div>
                <div className="text-sm text-gray-500">Next Period</div>
                <div className="text-lg font-bold text-gray-800">
                  {formatDateForDisplay(cycleData.nextPeriodDate)}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {calendarDays.map((item, idx) => {
              const colors = PHASE_COLORS[item.phase] || PHASE_COLORS.future;
              const dayOfMonth = item.date.getDate();
              
              return (
                <div
                  key={idx}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg border-2
                    ${colors.bg} ${colors.border}
                    ${item.isToday ? 'ring-4 ring-offset-2 ring-blue-600 shadow-lg' : ''}
                    transition hover:shadow-md
                  `}
                >
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {dayOfMonth}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatCalendarDate(item.date)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.phase === 'menstrual' && '●'}
                    {item.phase === 'follicular' && '○'}
                    {item.phase === 'ovulation' && '◆'}
                    {item.phase === 'luteal' && '◇'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today Indicator */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            📌 Day with a ring indicates today. The current phase is outlined.
          </div>
        </div>
      </div>
    </div>
  );
}
