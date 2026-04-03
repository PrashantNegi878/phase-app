import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Calendar } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { TrackerProfile } from '../types';
import { getToday, formatDateForInput, addDays, parseDateFromInput, formatDateForDisplay, normalizeDate } from '../utils/dateUtils';
import { useScrollLock } from '../hooks/useScrollLock';

interface LogPeriodProps {
  userId: string;
  trackerProfile?: TrackerProfile | null;
  onLogComplete: () => void;
  onCancel: () => void;
}

export function LogPeriod({ userId, trackerProfile, onLogComplete, onCancel }: LogPeriodProps) {
  useScrollLock();
  const today = getToday();
  const typicalPeriodLength = trackerProfile?.typicalPeriodLengthDays || 5;
  const defaultEndDate = addDays(today, typicalPeriodLength - 1);

  const [startDate, setStartDate] = useState(formatDateForInput(today));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEndDate));
  const [hasManuallyChangedEndDate, setHasManuallyChangedEndDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const parsedStart = parseDateFromInput(startDate);
    const parsedEnd = parseDateFromInput(endDate);

    // 1. Overlap Prevention & Chronological Integrity
    if (trackerProfile?.lastPeriodDate) {
      const lastStart = normalizeDate(trackerProfile.lastPeriodDate);
      const daysSinceLast = Math.ceil((parsedStart.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLast < 0) {
        setError(`Chronological Error: This entry occurs before your last recorded period (${formatDateForDisplay(lastStart)}). Chronological consistency is required for medical history.`);
        setSaving(false);
        return;
      }
      
      if (daysSinceLast < 21) {
        setError(`Date Verification Required: Your last period began only ${daysSinceLast} days ago. A new cycle typically requires a minimum of 21 days for clinical accuracy.`);
        setSaving(false);
        return;
      }
    }

    if (parsedStart > getToday()) {
      setError('Period start date cannot be in the future');
      setSaving(false);
      return;
    }

    if (parsedEnd < parsedStart) {
      setError('Period end date must be after start date');
      setSaving(false);
      return;
    }

    const durationDays = Math.ceil((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (durationDays > 10) {
      setError('Period duration cannot exceed 10 days. Please check your dates.');
      setSaving(false);
      return;
    }

    try {
      await cycleService.recordPeriodStart(userId, parsedStart, parsedEnd);
      onLogComplete();
    } catch (err) {
      console.error('Error logging period:', err);
      setError(err instanceof Error ? err.message : 'Failed to save period');
    } finally {
      setSaving(false);
    }
  };

  const buttonTap = { scale: 0.97 };
  const periodDuration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-card-bg rounded-4xl w-full sm:max-w-md shadow-soft-lg overflow-hidden border border-border-subtle"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="sticky top-0 bg-card-bg border-b border-border-subtle flex items-center justify-between p-5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-rose-500" />
            </div>
            <h2 className="text-lg font-semibold text-text-main">Log Period</h2>
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

        <form onSubmit={handleSavePeriod} className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm opacity-100"
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
              max={formatDateForInput(today)}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!hasManuallyChangedEndDate) {
                  const startDateObj = new Date(e.target.value);
                  const endDateObj = new Date(startDateObj);
                  endDateObj.setDate(startDateObj.getDate() + (typicalPeriodLength - 1));
                  setEndDate(formatDateForInput(endDateObj));
                }
              }}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-sage-400 dark:focus:border-sage-600 focus:ring-4 focus:ring-sage-100 dark:focus:ring-sage-900/30 transition-colors duration-200 opacity-100 bg-app-bg dark:bg-slate-800 text-text-main"
              required
            />
            <p className="mt-2 text-sm text-text-muted">
              {formatDateForDisplay(new Date(startDate))}
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="flex items-center gap-2 text-sm font-medium text-text-main mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Period End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setHasManuallyChangedEndDate(true);
              }}
              className="w-full px-4 py-3 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-sage-400 dark:focus:border-sage-600 focus:ring-4 focus:ring-sage-100 dark:focus:ring-sage-900/30 transition-colors duration-200 opacity-100 bg-app-bg dark:bg-slate-800 text-text-main"
              required
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {formatDateForDisplay(new Date(endDate))}
              </p>
              <p className="text-sm text-sage-600 dark:text-sage-400 font-medium">
                {periodDuration} days
              </p>
            </div>
          </motion.div>

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
              disabled={saving}
              whileHover={saving ? {} : { y: -2 }}
              whileTap={saving ? {} : buttonTap}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Log Period'
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}