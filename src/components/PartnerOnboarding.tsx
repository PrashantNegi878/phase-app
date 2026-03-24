import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Link2, Edit3, ArrowLeft, ArrowRight, Users, Sparkles, Gift, MessageCircleHeart, Clock, Hand, Briefcase, GraduationCap, Dumbbell, Calendar, Check } from 'lucide-react';
import { authService } from '../services/auth';
import { cycleService } from '../services/cycle';

interface PartnerOnboardingProps {
  userId: string;
  onComplete: () => void;
}

const supportStyles = [
  { id: 'acts-of-service', label: 'Acts of Service', icon: Sparkles, description: 'Helping with tasks' },
  { id: 'gifts', label: 'Thoughtful Gifts', icon: Gift, description: 'Meaningful presents' },
  { id: 'emotional-support', label: 'Emotional Support', icon: MessageCircleHeart, description: 'Being there to listen' },
  { id: 'quality-time', label: 'Quality Time', icon: Clock, description: 'Undivided attention' },
  { id: 'physical-touch', label: 'Physical Touch', icon: Hand, description: 'Hugs and closeness' },
];

const scheduleTypes = [
  { id: 'flexible', label: 'Flexible', icon: Calendar, description: 'Open schedule' },
  { id: 'busy-student', label: 'Busy Student', icon: GraduationCap, description: 'Classes & studying' },
  { id: 'strict-gym-routine', label: 'Gym Routine', icon: Dumbbell, description: 'Fitness focused' },
  { id: 'business-professional', label: 'Professional', icon: Briefcase, description: 'Work commitments' },
];

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
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.08, 
        delayChildren: 0.1 
      } 
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } 
    },
  };

  const buttonTap = { scale: 0.97 };

  const PreferencesForm = () => (
    <div className="space-y-6">
      <motion.div variants={itemVariants} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Your Support Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {supportStyles.map((style) => {
            const Icon = style.icon;
            const isSelected = supportStyle === style.id;
            return (
              <motion.button
                key={style.id}
                type="button"
                onClick={() => setSupportStyle(style.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-3 rounded-xl border-2 text-left transition-colors duration-200 opacity-100 ${
                  isSelected
                    ? 'border-sage-400 bg-sage-50 shadow-sm'
                    : 'border-earth-200 bg-white hover:border-sage-200 hover:bg-sage-50/30'
                }`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected ? 'bg-sage-200' : 'bg-earth-100'
                }`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-sage-700' : 'text-earth-500'}`} />
                </div>
                <div className={`text-sm font-medium ${isSelected ? 'text-sage-800' : 'text-slate-700'}`}>
                  {style.label}
                </div>
                <div className="text-xs text-earth-500 mt-0.5">
                  {style.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Your Schedule
        </label>
        <div className="grid grid-cols-2 gap-2">
          {scheduleTypes.map((schedule) => {
            const Icon = schedule.icon;
            const isSelected = scheduleConstraints === schedule.id;
            return (
              <motion.button
                key={schedule.id}
                type="button"
                onClick={() => setScheduleConstraints(schedule.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-3 rounded-xl border-2 text-left transition-colors duration-200 opacity-100 ${
                  isSelected
                    ? 'border-sage-400 bg-sage-50 shadow-sm'
                    : 'border-earth-200 bg-white hover:border-sage-200 hover:bg-sage-50/30'
                }`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected ? 'bg-sage-200' : 'bg-earth-100'
                }`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-sage-700' : 'text-earth-500'}`} />
                </div>
                <div className={`text-sm font-medium ${isSelected ? 'text-sage-800' : 'text-slate-700'}`}>
                  {schedule.label}
                </div>
                <div className="text-xs text-earth-500 mt-0.5">
                  {schedule.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );

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
        className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <motion.div variants={itemVariants} className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sage-200 to-sage-300 mb-3 shadow-soft">
            <Users className="w-7 h-7 text-sage-700" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            Partner Setup
          </h1>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm opacity-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'link-choice' && (
            <motion.div
              key="link-choice"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <motion.p variants={itemVariants} className="text-earth-600 mb-4 text-center text-sm">
                How would you like to connect?
              </motion.p>

              <motion.button
                variants={itemVariants}
                onClick={() => setStep('link-input')}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full p-4 border-2 border-earth-200 rounded-2xl hover:border-sage-300 hover:bg-sage-50/50 transition-colors duration-200 opacity-100 text-left flex items-start gap-3"
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
                className="w-full p-4 border-2 border-earth-200 rounded-2xl hover:border-sage-300 hover:bg-sage-50/50 transition-colors duration-200 opacity-100 text-left flex items-start gap-3"
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
              variants={containerVariants}
              initial="hidden"
              animate="visible"
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

              <motion.div variants={itemVariants} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Partner's 6-digit code
                </label>
                <input
                  type="text"
                  value={partnerCode}
                  onChange={(e) => setPartnerCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-4 border-2 border-earth-200 rounded-2xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors duration-200 opacity-100 text-center text-2xl tracking-[0.3em] font-mono bg-white text-slate-700"
                />
              </motion.div>

              <PreferencesForm />

              <motion.button
                variants={itemVariants}
                onClick={handleLinkAccount}
                disabled={loading || partnerCode.length !== 6}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full mt-2 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              variants={containerVariants}
              initial="hidden"
              animate="visible"
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

              <motion.p variants={itemVariants} className="text-earth-600 text-sm">
                Set up your preferences for manual tracking:
              </motion.p>

              <PreferencesForm />

              <motion.button
                variants={itemVariants}
                onClick={handleManualMode}
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full mt-2 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue
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