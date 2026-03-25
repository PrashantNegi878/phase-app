import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, ArrowRight, Share2 } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { parseDateFromInput, getToday, formatDateForInput } from '../utils/dateUtils';

interface TrackerOnboardingProps {
  userId: string;
  partnerCode: string;
  onComplete: () => void;
}

export function TrackerOnboarding({
  userId,
  partnerCode,
  onComplete,
}: TrackerOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'period-date'>('welcome');
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasManuallyChangedEndDate, setHasManuallyChangedEndDate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug log to confirm component is rendering
  console.log('TrackerOnboarding rendering with partnerCode:', partnerCode);

  const handleContinue = async () => {
    if (step === 'welcome') {
      setStep('period-date');
    } else if (step === 'period-date') {
      if (!lastPeriodDate) {
        setError('Please enter your last period date');
        return;
      }
      const parsedStart = parseDateFromInput(lastPeriodDate);
      const parsedEnd = endDate ? parseDateFromInput(endDate) : undefined;

      if (parsedStart > getToday()) {
        setError('Period start date cannot be in the future');
        return;
      }

      if (parsedEnd && parsedEnd < parsedStart) {
        setError('Period end date must be after start date');
        return;
      }

      if (parsedEnd) {
        const durationDays = Math.ceil((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (durationDays > 10) {
          setError('Period duration cannot exceed 10 days. Please check your dates.');
          return;
        }
      }

      setLoading(true);
      setError('');
      try {
        await cycleService.recordPeriodStart(userId, parsedStart, parsedEnd);
        onComplete();
      } catch (err) {
        console.error('Onboarding error:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      } finally {
        setLoading(false);
      }
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
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-sage-200 to-sage-300 mb-6 shadow-soft">
                  <Sparkles className="w-8 h-8 text-sage-700" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
                  Welcome to Phase!
                </h1>
                <p className="text-earth-600 font-light">
                  Let's get you started with tracking your cycle.
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-gradient-to-r from-sage-50 to-earth-50 border border-sage-200 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Share2 className="w-4 h-4 text-sage-500" />
                  <span>Your Partner Code</span>
                </div>
                <p className="text-4xl font-bold text-sage-700 tracking-widest text-center font-mono">
                  {partnerCode}
                </p>
                <p className="text-xs text-earth-500 mt-3 text-center">
                  Share this code with your partner to link accounts
                </p>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleContinue}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}



          {step === 'period-date' && (
            <motion.div
              key="period-date"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 mb-4">
                  <Calendar className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2 tracking-tight">
                  When was your last period?
                </h2>
                <p className="text-sm text-earth-600">
                  This helps us predict your cycle phases accurately
                </p>
              </motion.div>

              <AnimatePresence>
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

              <motion.div variants={itemVariants} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    value={lastPeriodDate}
                    max={formatDateForInput(getToday())}
                    onChange={(e) => {
                      setLastPeriodDate(e.target.value);
                      if (!hasManuallyChangedEndDate) {
                        const startDateObj = new Date(e.target.value);
                        const endDateObj = new Date(startDateObj);
                        endDateObj.setDate(startDateObj.getDate() + 4);
                        setEndDate(formatDateForInput(endDateObj));
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors duration-200 opacity-100 bg-white text-slate-700"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors duration-200 opacity-100 bg-white text-slate-700"
                  />
                </div>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleContinue}
                disabled={loading || !lastPeriodDate}
                whileHover={loading || !lastPeriodDate ? {} : { y: -2 }}
                whileTap={loading || !lastPeriodDate ? {} : buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Start Tracking
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