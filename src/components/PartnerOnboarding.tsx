import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Link2, Edit3, ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { authService } from '../services/auth';
import { cycleService } from '../services/cycle';

interface PartnerOnboardingProps {
  userId: string;
  onComplete: () => void;
}

export function PartnerOnboarding({ userId, onComplete }: PartnerOnboardingProps) {
  const [step, setStep] = useState<'link-choice' | 'link-input' | 'manual-setup'>('link-choice');
  const [partnerCode, setPartnerCode] = useState('');
  const [supportStyle, setSupportStyle] = useState('acts-of-service');
  const [scheduleConstraints, setScheduleConstraints] = useState('flexible');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkAccount = async () => {
    if (!partnerCode || partnerCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.linkPartnerToTracker(userId, partnerCode);
      await cycleService.updatePartnerProfile(userId, supportStyle, scheduleConstraints);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setLoading(false);
    }
  };

  const handleManualMode = async () => {
    setLoading(true);
    setError('');
    try {
      await cycleService.updatePartnerProfile(userId, supportStyle, scheduleConstraints);
      onComplete();
    } catch (err) {
      console.error('Error in handleManualMode:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup profile');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  };
  const buttonTap = { scale: 0.97 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50 to-earth-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-earth-200/40 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative bg-white/80 backdrop-blur-xl rounded-4xl shadow-soft-lg w-full max-w-md p-8"
      >
        <motion.div variants={itemVariants} className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-sage-200 to-sage-300 mb-4 shadow-soft">
            <Users className="w-8 h-8 text-sage-700" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            Partner Setup
          </h1>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'link-choice' && (
            <motion.div
              key="link-choice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <motion.p variants={itemVariants} className="text-earth-600 mb-6 text-center">
                How would you like to connect?
              </motion.p>

              <motion.button
                variants={itemVariants}
                onClick={() => setStep('link-input')}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full p-5 border-2 border-earth-200 rounded-2xl hover:border-sage-300 hover:bg-sage-50/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-sage-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Link Account</div>
                  <div className="text-sm text-earth-500">Enter your partner's 6-digit code</div>
                </div>
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => setStep('manual-setup')}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full p-5 border-2 border-earth-200 rounded-2xl hover:border-sage-300 hover:bg-sage-50/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-earth-100 flex items-center justify-center flex-shrink-0">
                  <Edit3 className="w-5 h-5 text-earth-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Manual Mode</div>
                  <div className="text-sm text-earth-500">I'll track data myself</div>
                </div>
              </motion.button>
            </motion.div>
          )}

          {step === 'link-input' && (
            <motion.div
              key="link-input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <motion.button
                variants={itemVariants}
                type="button"
                onClick={() => setStep('link-choice')}
                className="flex items-center gap-2 text-sage-600 hover:text-sage-700 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>

              <motion.p variants={itemVariants} className="text-earth-600">
                Enter your partner's 6-digit code:
              </motion.p>

              <motion.input
                variants={itemVariants}
                type="text"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-earth-200 rounded-2xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all text-center text-3xl tracking-widest font-mono bg-white text-slate-700"
              />

              <motion.div variants={itemVariants} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Your Support Style:
                </label>
                <select
                  value={supportStyle}
                  onChange={(e) => setSupportStyle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
                >
                  <option value="acts-of-service">Acts of Service</option>
                  <option value="gifts">Gifts</option>
                  <option value="emotional-support">Emotional Support</option>
                  <option value="quality-time">Quality Time</option>
                  <option value="physical-touch">Physical Touch</option>
                </select>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Daily Schedule:
                </label>
                <select
                  value={scheduleConstraints}
                  onChange={(e) => setScheduleConstraints(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
                >
                  <option value="busy-student">Busy Student</option>
                  <option value="flexible">Flexible</option>
                  <option value="strict-gym-routine">Strict Gym Routine</option>
                  <option value="business-professional">Business Professional</option>
                </select>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleLinkAccount}
                disabled={loading || partnerCode.length !== 6}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full mt-4 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Link Account
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {step === 'manual-setup' && (
            <motion.div
              key="manual-setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <motion.button
                variants={itemVariants}
                type="button"
                onClick={() => setStep('link-choice')}
                className="flex items-center gap-2 text-sage-600 hover:text-sage-700 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>

              <motion.p variants={itemVariants} className="text-earth-600">
                Set up your preferences for manual tracking:
              </motion.p>

              <motion.div variants={itemVariants} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Your Support Style:
                </label>
                <select
                  value={supportStyle}
                  onChange={(e) => setSupportStyle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
                >
                  <option value="acts-of-service">Acts of Service</option>
                  <option value="gifts">Gifts</option>
                  <option value="emotional-support">Emotional Support</option>
                  <option value="quality-time">Quality Time</option>
                  <option value="physical-touch">Physical Touch</option>
                </select>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Daily Schedule:
                </label>
                <select
                  value={scheduleConstraints}
                  onChange={(e) => setScheduleConstraints(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-all bg-white text-slate-700"
                >
                  <option value="busy-student">Busy Student</option>
                  <option value="flexible">Flexible</option>
                  <option value="strict-gym-routine">Strict Gym Routine</option>
                  <option value="business-professional">Business Professional</option>
                </select>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleManualMode}
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full mt-4 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
