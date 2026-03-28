import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Info, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TrackerProfile } from '../types';
import { getToday, normalizeDate } from '../utils/dateUtils';
import { cycleService } from '../services/cycle';
import { MIN_TYPICAL_CYCLE_LENGTH, MAX_TYPICAL_CYCLE_LENGTH } from '../constants/cycle';

interface SettingsProps {
  userId: string;
  onBack: () => void;
}

export function Settings({ userId, onBack }: SettingsProps) {
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [ovulationDate, setOvulationDate] = useState<Date | null>(null);
  const [originalCycleLength, setOriginalCycleLength] = useState(28);
  const [lastPeriodDate, setLastPeriodDate] = useState<Date | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Profile
        const profileSnap = await getDoc(doc(db, 'trackerProfiles', userId));
        if (profileSnap.exists()) {
          const profile = profileSnap.data() as TrackerProfile;
          setCycleLengthDays(profile.cycleLengthDays || 28);
          setOriginalCycleLength(profile.cycleLengthDays || 28);
          if (profile.lastPeriodDate) {
            setLastPeriodDate(normalizeDate(profile.lastPeriodDate));
          }
        }

        // Fetch Cycle Data for Ovulation status
        const cycleSnap = await getDoc(doc(db, 'cycleData', userId));
        if (cycleSnap.exists()) {
          const cycleData = cycleSnap.data();
          if (cycleData.ovulationDetectedDate) {
            setOvulationDate(normalizeDate(cycleData.ovulationDetectedDate));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleSave = async (forceDelete = false) => {
    if (isManualOverride && !forceDelete) {
      setShowConfirmDelete(true);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      // If manual override confirmed, delete the symptoms for this month
      if (forceDelete && lastPeriodDate) {
        await cycleService.deleteCurrentCycleLogs(userId, lastPeriodDate);
      }

      await updateDoc(doc(db, 'trackerProfiles', userId), {
        cycleLengthDays,
        updatedAt: getToday(),
      });
      
      // Recalculate cycle data to apply the new cycle length directly
      // Pass the explicit manual length to suppress smart sync recalculation
      await cycleService.updateCyclePhaseRealTime(userId, cycleLengthDays);
      setIsSuccess(true);
      setShowConfirmDelete(false);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update cycle length');
    } finally {
      setSaving(false);
    }
  };

  const isManualOverride = ovulationDate && cycleLengthDays !== originalCycleLength;

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md p-6 shadow-soft-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-earth-600">Loading settings...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-soft-lg overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="settings-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col"
            >
              {/* Header */}
              <div className="border-b border-earth-100 flex items-center justify-between p-6 z-10 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-sage-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">Settings</h2>
                </div>
                <motion.button
                  onClick={onBack}
                  whileHover={{ scale: 1.05 }}
                  whileTap={buttonTap}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-600 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Cycle Length Setting */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-slate-700">
                      Typical Cycle Length
                    </label>
                    {ovulationDate && !isManualOverride && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-2 py-1 bg-sage-50 text-sage-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-sage-100 flex items-center gap-1.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse" />
                        Smart Optimized
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <input
                      type="range"
                      min={MIN_TYPICAL_CYCLE_LENGTH}
                      max={MAX_TYPICAL_CYCLE_LENGTH}
                      value={cycleLengthDays}
                      onChange={(e) => setCycleLengthDays(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-earth-200 rounded-lg appearance-none cursor-pointer accent-sage-500"
                    />
                    <div className="text-center bg-sage-50 rounded-xl px-4 py-2 min-w-[80px]">
                      <div className="text-2xl font-bold text-sage-700">
                        {cycleLengthDays}
                      </div>
                      <div className="text-xs text-earth-500">days</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-earth-600">
                    Expected ovulation: <span className="font-medium text-sage-600">Day {Math.round(cycleLengthDays / 2)}</span>
                  </p>
                </div>

                {/* Info / Warning box */}
                <AnimatePresence mode="wait">
                  {isManualOverride ? (
                    <motion.div
                      key="warning"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 shadow-sm"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-red-800">Manual Override Warning</p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          Note: You've already logged symptoms that detected ovulation. Manually changing this length will <strong>delete all symptoms for this month</strong> to allow a clean-slate reset.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex gap-3"
                    >
                      <Info className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-sage-700">
                        {ovulationDate 
                          ? `Ovulation detected on ${ovulationDate.toLocaleDateString()}. Your cycle length for this month has been automatically optimized.`
                          : "Phases are predicted based on your typical cycle length. Your actual ovulation day is detected automatically as you log symptoms."
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                  {message && message.includes('Failed') && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    onClick={onBack}
                    whileHover={{ y: -2 }}
                    whileTap={buttonTap}
                    className="flex-1 px-4 py-3 border-2 border-earth-200 text-slate-700 font-medium rounded-xl hover:border-earth-300 hover:bg-earth-50 transition-colors duration-200"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={() => handleSave()}
                    disabled={saving}
                    whileHover={{ y: -2 }}
                    whileTap={buttonTap}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-colors duration-200 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings-success"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="p-10 flex flex-col items-center justify-center text-center min-h-[350px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 mb-8 shadow-soft-lg"
              >
                <Check className="w-10 h-10" strokeWidth={3} />
              </motion.div>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-slate-800 mb-3"
              >
                Settings Updated!
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-earth-600 max-w-[200px]"
              >
                {isManualOverride ? (
                  "Your cycle has been reset and logs have been cleared."
                ) : (
                  <>Your cycle length is now set to <strong>{cycleLengthDays} days</strong>.</>
                )}
              </motion.p>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="mt-8 text-xs text-earth-500 uppercase tracking-widest font-semibold"
              >
                Returning to Dashboard...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Second Confirmation Modal for Data Deletion */}
        <AnimatePresence>
          {showConfirmDelete && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[60]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-red-100"
              >
                <div className="bg-red-50 p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-red-800 mb-2">Are you sure?</h3>
                  <p className="text-red-700 text-sm leading-relaxed mb-6">
                    This will permanently <strong>delete all your symptom logs</strong> for the current month. This action cannot be undone.
                  </p>
                  
                  <div className="flex flex-col w-full gap-3">
                    <motion.button
                      onClick={() => handleSave(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-colors"
                    >
                      Yes, Delete & Reset
                    </motion.button>
                    <motion.button
                      onClick={() => setShowConfirmDelete(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 bg-white border-2 border-earth-200 text-slate-600 font-semibold rounded-2xl hover:bg-earth-50 transition-colors"
                    >
                      No, Keep my logs
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}