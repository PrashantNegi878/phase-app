import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Calendar, AlertTriangle } from 'lucide-react';
import { collection, doc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData, TrackerProfile, CycleHistory } from '../types';
import { normalizeDate, formatDateForInput, parseDateFromInput, formatDateForDisplay, getToday, daysBetween } from '../utils/dateUtils';

interface EditPeriodProps {
  userId: string;
  trackerProfile?: TrackerProfile | null;
  onEditComplete: () => void;
  onCancel: () => void;
}

export function EditPeriod({ userId, trackerProfile, onEditComplete, onCancel }: EditPeriodProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastHistory, setLastHistory] = useState<CycleHistory | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Current Cycle
        const docSnap = await getDoc(doc(db, 'cycleData', userId));
        if (docSnap.exists()) {
          const data = docSnap.data() as CycleData;
          setCycleData(data);
          if (data.lastPeriodDate) {
            const start = normalizeDate(data.lastPeriodDate);
            setStartDate(formatDateForInput(start));
          }
          if (data.periodEndDate) {
            const end = normalizeDate(data.periodEndDate);
            setEndDate(formatDateForInput(end));
          }
        }

        // 2. Fetch Last History Entry for Boundary Checks
        const hq = query(
          collection(db, 'cycleHistory'),
          where('userId', '==', userId),
          orderBy('startDate', 'desc'),
          limit(1)
        );
        const historySnap = await getDocs(hq);
        if (!historySnap.empty) {
          setLastHistory(historySnap.docs[0].data() as CycleHistory);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load period data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const parsedStart = parseDateFromInput(startDate);
  const parsedEnd = endDate ? parseDateFromInput(endDate) : undefined;

  // Validation Logic
  const originalStart = cycleData?.lastPeriodDate ? normalizeDate(cycleData.lastPeriodDate) : null;
  const isStartDateChanged = originalStart && parsedStart.getTime() !== originalStart.getTime();
  
  const prevCycleLength = lastHistory && isStartDateChanged 
    ? daysBetween(normalizeDate(lastHistory.startDate), parsedStart) 
    : null;

  const isGuardrailViolated = prevCycleLength !== null && (prevCycleLength < 21 || prevCycleLength > 55);
  const hasManualOvulation = lastHistory && !!lastHistory.ovulationDate && !lastHistory.isPredictedOvulation;
  
  const isHormonalOverride = isStartDateChanged && hasManualOvulation;

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (parsedStart > getToday()) {
      setError('Period start date cannot be in the future');
      return;
    }

    if (parsedEnd && parsedEnd < parsedStart) {
      setError('Period end date must be after start date');
      return;
    }

    if (isGuardrailViolated) {
      setError(`Clinical Guardrail: This adjustment results in a ${Math.abs(prevCycleLength!)}-day cycle, which falls outside the 21–55 day clinical parameters. Please adjust the dates to maintain the integrity of your medical record.`);
      return;
    }

    // Trigger confirmation if destructive scenario detected
    if (isStartDateChanged) {
      setShowConfirmation(true);
    } else {
      performUpdate();
    }
  };

  const performUpdate = async () => {
    setSaving(true);
    setError('');
    try {
      await cycleService.updateCurrentCyclePeriod(userId, parsedStart, parsedEnd);
      onEditComplete();
    } catch (err) {
      console.error('Error updating period:', err);
      setError(err instanceof Error ? err.message : 'Failed to update period');
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  };

  const buttonTap = { scale: 0.97 };

  // Animation Variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    },
    exit: { opacity: 0, scale: 0.95, y: 20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } 
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card-bg rounded-3xl w-full max-w-lg shadow-soft-xl overflow-hidden border border-border-subtle"
        >
          <div className="p-6 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-text-muted">Loading period data...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          className="bg-card-bg rounded-3xl w-full sm:max-w-md p-6 text-center shadow-soft-lg border border-border-subtle"
        >
          <p className="text-text-muted mb-4">No period data to edit yet.</p>
          <motion.button
            onClick={onCancel}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="px-6 py-3 bg-app-bg dark:bg-slate-800 text-text-main font-medium rounded-xl hover:bg-earth-200 dark:hover:bg-slate-700 transition-colors duration-200 opacity-100"
          >
            Close
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const periodDuration = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-card-bg rounded-3xl w-full sm:max-w-md shadow-soft-lg overflow-hidden border border-border-subtle"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="sticky top-0 bg-card-bg border-b border-border-subtle flex items-center justify-between p-5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-sage-600 dark:text-sage-400" />
            </div>
            <h2 className="text-lg font-semibold text-text-main">Edit Period</h2>
          </div>
          <motion.button
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            whileTap={buttonTap}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 dark:hover:bg-slate-700 text-text-muted hover:text-text-main transition-colors duration-200 opacity-100"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>

        <form onSubmit={handleSaveChanges} className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm opacity-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-2 text-sm font-medium text-text-main mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Period Start Date
            </label>
            <input
              type="date"
              value={startDate}
              max={formatDateForInput(getToday())}
              onChange={(e) => {
                setStartDate(e.target.value);
                const startDateObj = new Date(e.target.value);
                const endDateObj = new Date(startDateObj);
                const typicalPeriodLength = trackerProfile?.typicalPeriodLengthDays || 5;
                endDateObj.setDate(startDateObj.getDate() + (typicalPeriodLength - 1));
                setEndDate(formatDateForInput(endDateObj));
              }}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-sage-400 dark:focus:border-sage-600 focus:ring-4 focus:ring-sage-100 dark:focus:ring-sage-900/30 transition-colors duration-200 opacity-100 bg-app-bg dark:bg-slate-800 text-text-main"
              required
            />
            {startDate && (
              <p className="mt-2 text-sm text-text-muted">
                {formatDateForDisplay(new Date(startDate))}
              </p>
            )}
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-2 text-sm font-medium text-text-main mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Period End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-sage-400 dark:focus:border-sage-600 focus:ring-4 focus:ring-sage-100 dark:focus:ring-sage-900/30 transition-colors duration-200 opacity-100 bg-app-bg dark:bg-slate-800 text-text-main"
            />
            {endDate && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  {formatDateForDisplay(new Date(endDate))}
                </p>
                {periodDuration && (
                  <p className="text-sm text-sage-600 dark:text-sage-400 font-medium">
                    {periodDuration} days
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Clinical Alerts */}
          <AnimatePresence>
            {isStartDateChanged && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-2"
              >
                  <div className={`p-4 rounded-2xl border flex gap-3 ${
                    isGuardrailViolated 
                      ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-700 dark:text-rose-400' 
                      : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400'
                  }`}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">
                        {isGuardrailViolated ? 'Clinical Parameter Alert' : 'Cycle Boundary Modification'}
                      </p>
                      <p>
                        {isGuardrailViolated 
                          ? `This adjustment results in a ${Math.abs(prevCycleLength!)}-day cycle, which falls outside the established 21–55 day parameters.`
                          : `This modification will adjust your previous cycle length to ${Math.abs(prevCycleLength!)} days.`}
                      </p>
                    </div>
                  </div>
              </motion.div>
            )}

            {isHormonalOverride && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="p-4 rounded-2xl border flex gap-3 bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-1">Ovulation Overlap Notice</p>
                    <p>
                      This adjustment overlaps with your last recorded ovulation. To maintain a consistent medical history, related symptomatic logs will be reset.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Buttons */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-2">
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="flex-1 px-4 py-3 border-2 border-border-subtle text-text-main font-medium rounded-xl hover:border-earth-300 dark:hover:border-slate-700 hover:bg-earth-50 dark:hover:bg-slate-800 transition-colors duration-200 opacity-100"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={saving || isGuardrailViolated}
              whileHover={saving || isGuardrailViolated ? {} : { y: -2 }}
              whileTap={saving || isGuardrailViolated ? {} : buttonTap}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Update Period'
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* RE-ARCHITECTED: Confirmation Modal */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[60]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card-bg rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-border-subtle"
              >
                <div className="p-8 text-center uppercase tracking-widest text-[10px] font-bold text-rose-500 mb-2">
                  Important: Clinical Update Required
                </div>
                <div className="px-8 pb-4 text-center">
                  <h3 className="text-xl font-bold text-text-main mb-3">Confirm Date Adjustments</h3>
                  <p className="text-text-muted text-sm leading-relaxed mb-6">
                    {isHormonalOverride 
                      ? "This change conflicts with your previous cycle's manual ovulation. To ensure medical consistency, related symptomatic logs will be reset and both cycles will be recalculated."
                      : "Modifying your period start date will reset your symptoms and phase calculations for the current cycle to maintain clinical accuracy. Proceed with the update?"}
                  </p>
                </div>
                
                <div className="p-6 bg-app-bg dark:bg-slate-800 flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 py-4 text-text-muted font-semibold hover:bg-card-bg dark:hover:bg-slate-700 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={performUpdate}
                    disabled={saving}
                    className="flex-2 px-6 py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? "Updating..." : "Confirm Update"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}