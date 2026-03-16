import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Calendar, Info } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData } from '../types';
import { normalizeDate, formatDateForInput, parseDateFromInput, formatDateForDisplay } from '../utils/dateUtils';

interface EditPeriodProps {
  userId: string;
  onEditComplete: () => void;
  onCancel: () => void;
}

export function EditPeriod({ userId, onEditComplete, onCancel }: EditPeriodProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCycleData = async () => {
      try {
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
      } catch (err) {
        console.error('Error fetching cycle data:', err);
        setError('Failed to load period data');
      } finally {
        setLoading(false);
      }
    };
    fetchCycleData();
  }, [userId]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('Period end date must be after start date');
      setSaving(false);
      return;
    }

    try {
      await cycleService.recordPeriodStart(userId, parseDateFromInput(startDate), endDate ? parseDateFromInput(endDate) : undefined);
      onEditComplete();
    } catch (err) {
      console.error('Error updating period:', err);
      setError(err instanceof Error ? err.message : 'Failed to update period');
    } finally {
      setSaving(false);
    }
  };

  const buttonTap = { scale: 0.97 };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl w-full sm:max-w-md p-6 shadow-soft-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-earth-600">Loading period data...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 text-center shadow-soft-lg"
        >
          <p className="text-earth-600 mb-4">No period data to edit yet.</p>
          <motion.button
            onClick={onCancel}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="px-6 py-3 bg-earth-100 text-slate-700 font-medium rounded-xl hover:bg-earth-200 transition-all"
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-soft-lg"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-earth-100 flex items-center justify-between p-5 sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-sage-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Edit Period</h2>
          </div>
          <motion.button
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            whileTap={buttonTap}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSaveChanges} className="p-6 space-y-5">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Period Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                const startDateObj = new Date(e.target.value);
                const endDateObj = new Date(startDateObj);
                endDateObj.setDate(startDateObj.getDate() + 4);
                setEndDate(formatDateForInput(endDateObj));
              }}
              className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
              required
            />
            <p className="mt-2 text-sm text-earth-500">
              {formatDateForDisplay(new Date(startDate))}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Period End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
            />
            {endDate && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-earth-500">
                  {formatDateForDisplay(new Date(endDate))}
                </p>
                {periodDuration && (
                  <p className="text-sm text-sage-600 font-medium">
                    {periodDuration} days
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-sage-700">
              Updating the period will recalculate your cycle phases and ovulation prediction.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="flex-1 px-4 py-3 border-2 border-earth-200 text-slate-700 font-medium rounded-xl hover:border-earth-300 hover:bg-earth-50 transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </div>
        </form>
      </motion.div>
    </div>
  );
}
