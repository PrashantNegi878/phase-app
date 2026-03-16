import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, FileText } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { TrackerProfile } from '../types';
import { getToday, formatDateForInput, formatDateForDisplay } from '../utils/dateUtils';

interface LogSymptomsProps {
  userId: string;
  onLogComplete: () => void;
  onCancel: () => void;
}

export function LogSymptoms({ userId, onLogComplete, onCancel }: LogSymptomsProps) {
  const [date, setDate] = useState(formatDateForInput(getToday()));
  const [symptoms, setSymptoms] = useState<any>({});
  const [trackerProfile, setTrackerProfile] = useState<TrackerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await cycleService.getTrackerProfile(userId);
        setTrackerProfile(profile);
      } catch (err) {
        setError('Failed to load tracker profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  const handleSaveSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await cycleService.logDailySymptoms(userId, new Date(date), symptoms);
      onLogComplete();
    } catch (err) {
      console.error('Error saving symptoms:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save symptoms';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const buttonTap = { scale: 0.97 };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-soft-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-earth-600">Loading...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-soft-lg"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-earth-100 flex items-center justify-between p-5 sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sage-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Log Symptoms</h2>
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

        <form onSubmit={handleSaveSymptoms} className="p-6 space-y-5">
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

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-sage-500" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
            />
            <p className="mt-2 text-sm text-earth-500">
              {formatDateForDisplay(new Date(date))}
            </p>
          </div>

          {/* Cervical Fluid */}
          {trackerProfile?.trackedSymptoms?.includes('cervical-fluid') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cervical Fluid
              </label>
              <select
                value={symptoms.cervicalFluid || ''}
                onChange={(e) => setSymptoms({ ...symptoms, cervicalFluid: e.target.value })}
                className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
              >
                <option value="">Not tracked today</option>
                <option value="none">None</option>
                <option value="sticky">Sticky</option>
                <option value="creamy">Creamy</option>
                <option value="egg-white">Egg-White (Clear & Stretchy)</option>
              </select>
            </div>
          )}

          {/* Basal Body Temperature */}
          {trackerProfile?.trackedSymptoms?.includes('bbt') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Basal Body Temperature (C)
              </label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="39"
                value={symptoms.bbt || ''}
                onChange={(e) => setSymptoms({ ...symptoms, bbt: parseFloat(e.target.value) || '' })}
                placeholder="36.5"
                className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
              />
            </div>
          )}

          {/* Cramps */}
          {trackerProfile?.trackedSymptoms?.includes('cramps') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cramps
              </label>
              <select
                value={symptoms.cramps || ''}
                onChange={(e) => setSymptoms({ ...symptoms, cramps: e.target.value })}
                className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
              >
                <option value="">Not tracked today</option>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          )}

          {/* Mood */}
          {trackerProfile?.trackedSymptoms?.includes('mood') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mood
              </label>
              <select
                value={symptoms.mood || ''}
                onChange={(e) => setSymptoms({ ...symptoms, mood: e.target.value })}
                className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
              >
                <option value="">Not tracked today</option>
                <option value="happy">Happy</option>
                <option value="neutral">Neutral</option>
                <option value="sad">Sad</option>
                <option value="anxious">Anxious</option>
                <option value="irritable">Irritable</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 text-sage-500" />
              Notes (optional)
            </label>
            <textarea
              value={symptoms.notes || ''}
              onChange={(e) => setSymptoms({ ...symptoms, notes: e.target.value })}
              placeholder="Any other observations..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700 resize-none"
            />
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
                'Save Symptoms'
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
