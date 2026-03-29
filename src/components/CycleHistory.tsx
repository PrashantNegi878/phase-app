import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Calendar, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { CycleHistory as CycleHistoryType, CycleData } from '../types';
import { cycleService } from '../services/cycle';
import { formatDateForDisplay, normalizeDate, calculatePhaseDates } from '../utils/dateUtils';
import { CycleCalendar } from './CycleCalendar';

interface CycleHistoryProps {
  userId: string;
  onClose: () => void;
}

export function CycleHistory({ userId, onClose }: CycleHistoryProps) {
  const [history, setHistory] = useState<CycleHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycleData, setSelectedCycleData] = useState<CycleData | null>(null);

  const handleItemClick = (item: CycleHistoryType) => {
    // If the record has frozen phase dates, use them directly (Frozen Time Machine)
    // Otherwise fallback to calculation (Legacy support)
    const hasFrozenData = !!item.menstrualPhaseStart;

    const pseudoCycleData: CycleData = hasFrozenData ? {
      userId: item.userId,
      lastPeriodDate: item.startDate,
      nextPeriodDate: item.endDate,
      ovulationDetectedDate: item.ovulationDate,
      dayOfCycle: 0,
      menstrualPhaseStart: item.menstrualPhaseStart,
      menstrualPhaseEnd: item.menstrualPhaseEnd,
      follicularPhaseStart: item.follicularPhaseStart,
      follicularPhaseEnd: item.follicularPhaseEnd,
      ovulationPhaseStart: item.ovulationPhaseStart,
      ovulationPhaseEnd: item.ovulationPhaseEnd,
      lutealPhaseStart: item.lutealPhaseStart,
      lutealPhaseEnd: item.lutealPhaseEnd,
      nextMenstrualPhaseStart: item.nextMenstrualPhaseStart,
      nextMenstrualPhaseEnd: item.nextMenstrualPhaseEnd,
      updatedAt: new Date()
    } as CycleData : {
      userId: item.userId,
      lastPeriodDate: item.startDate,
      nextPeriodDate: item.endDate,
      ovulationDetectedDate: item.ovulationDate,
      dayOfCycle: 0,
      ...calculatePhaseDates(
        normalizeDate(item.startDate),
        item.ovulationDate ? normalizeDate(item.ovulationDate) : null,
        item.cycleLength,
        normalizeDate(item.endDate)
      ),
      updatedAt: new Date()
    };

    setSelectedCycleData(pseudoCycleData);
  };

  useEffect(() => {
    const unsubscribe = cycleService.onCycleHistoryChange(userId, (data) => {
      setHistory(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

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
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-card-bg rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-soft-xl border border-border-subtle"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card-bg border-b border-border-subtle flex items-center justify-between p-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center text-sage-600 dark:text-sage-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-main">Cycle History</h2>
              <p className="text-xs text-text-muted">Your past 12 months</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 dark:hover:bg-slate-700 text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
              <p className="text-text-muted text-sm">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-app-bg dark:bg-slate-800/40 flex items-center justify-center text-text-muted opacity-40">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-text-main font-medium">No archived cycles yet</p>
              <p className="text-xs text-text-muted max-w-[200px]">
                History is automatically created when you log a new period start.
              </p>
            </div>
          ) : (
            history.map((item: CycleHistoryType, idx: number) => (
              <motion.button
                key={item.id || idx}
                variants={itemVariants}
                onClick={() => handleItemClick(item)}
                className="w-full text-left bg-card-bg border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sage-200 dark:hover:border-sage-700 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] text-text-muted opacity-60 font-bold uppercase tracking-wider mb-1">
                      Cycle Period
                    </div>
                    <div className="text-sm font-semibold text-text-main flex items-center gap-2">
                      {formatDateForDisplay(normalizeDate(item.startDate))} - {formatDateForDisplay(normalizeDate(item.endDate))}
                      <ChevronRight className="w-3 h-3 text-text-muted opacity-40 group-hover:text-sage-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-text-muted opacity-60 font-bold uppercase tracking-wider mb-1">
                      Duration
                    </div>
                    <div className="text-lg font-bold text-sage-600 dark:text-sage-400">
                      {item.cycleLength} Days
                    </div>
                  </div>
                </div>

                <div className="bg-app-bg dark:bg-slate-800/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.ovulationDate ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-sage-500" />
                        <span className="text-xs text-text-main/80">
                          Ovulation: <span className="font-bold">Day {item.dayOvulationOccurred}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-text-muted opacity-40" />
                        <span className="text-xs text-text-muted italic">No symptoms logged</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted opacity-60">
                    {item.ovulationDate ? 'Smart Logged' : 'Predicted Only'}
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>

      </motion.div>

      <AnimatePresence>
        {selectedCycleData && (
          <CycleCalendar 
            cycleData={selectedCycleData} 
            cycleLengthDays={history.find(h => normalizeDate(h.startDate).getTime() === normalizeDate(selectedCycleData.lastPeriodDate).getTime())?.cycleLength || 28}
            isHistory={true}
            onClose={() => setSelectedCycleData(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
