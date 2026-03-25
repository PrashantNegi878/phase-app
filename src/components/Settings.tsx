import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Info, Check } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TrackerProfile } from '../types';
import { getToday } from '../utils/dateUtils';
import { cycleService } from '../services/cycle';

interface SettingsProps {
  userId: string;
  onBack: () => void;
}

export function Settings({ userId, onBack }: SettingsProps) {
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'trackerProfiles', userId));
        if (docSnap.exists()) {
          const profile = docSnap.data() as TrackerProfile;
          setCycleLengthDays(profile.cycleLengthDays || 28);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateDoc(doc(db, 'trackerProfiles', userId), {
        cycleLengthDays,
        updatedAt: getToday(),
      });
      
      // Recalculate cycle data to apply the new cycle length directly
      await cycleService.updateCyclePhaseRealTime(userId);
      setMessage('Cycle length updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update cycle length');
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-md p-6 shadow-soft-lg"
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
        className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-soft-lg overflow-hidden"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="border-b border-earth-100 flex items-center justify-between p-6 z-10 relative">
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
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-600 transition-colors duration-200 opacity-100"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cycle Length Setting */}
          <motion.div variants={itemVariants}>
            <label className="block text-sm font-medium text-slate-700 mb-4">
              Typical Cycle Length
            </label>
            <div className="flex items-center gap-6">
              <input
                type="range"
                min="21"
                max="40"
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
          </motion.div>

          {/* Info box */}
          <motion.div variants={itemVariants} className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex gap-3 opacity-100">
            <Info className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-sage-700">
              Phases are predicted based on your cycle length. Your actual ovulation day is detected automatically as you log symptoms.
            </p>
          </motion.div>

          {/* Message */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`text-sm p-4 rounded-2xl flex items-center gap-2 opacity-100 ${
                  message.includes('Failed')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-sage-50 text-sage-700 border border-sage-200'
                }`}
              >
                {!message.includes('Failed') && <Check className="w-4 h-4" />}
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-2">
            <motion.button
              onClick={onBack}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="flex-1 px-4 py-3 border-2 border-earth-200 text-slate-700 font-medium rounded-xl hover:border-earth-300 hover:bg-earth-50 transition-colors duration-200 opacity-100"
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-colors duration-200 opacity-100 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}