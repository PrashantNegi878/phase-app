import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, ArrowRight, Share2, Clock, Briefcase, GraduationCap, Dumbbell, Check, ArrowLeft } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { parseDateFromInput, getToday, formatDateForInput } from '../utils/dateUtils';

interface TrackerOnboardingProps {
  userId: string;
  partnerCode: string;
  onComplete: () => void;
  isPartner?: boolean;
}

const scheduleTypes = [
  { id: 'flexible', label: 'Flexible', icon: Calendar, description: 'Open schedule' },
  { id: 'busy-student', label: 'Busy Student', icon: GraduationCap, description: 'Classes & studying' },
  { id: 'strict-gym-routine', label: 'Gym Routine', icon: Dumbbell, description: 'Fitness focused' },
  { id: 'business-professional', label: 'Professional', icon: Briefcase, description: 'Work commitments' },
];

export function TrackerOnboarding({
  userId,
  partnerCode,
  onComplete,
  isPartner = false,
}: TrackerOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'cycle-basics' | 'period-date' | 'schedule'>(
    isPartner ? 'cycle-basics' : 'welcome'
  );
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [typicalPeriodLengthDays, setTypicalPeriodLengthDays] = useState(5);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleConstraints, setScheduleConstraints] = useState('flexible');
  const [hasManuallyChangedEndDate, setHasManuallyChangedEndDate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug log to confirm component is rendering
  console.log('TrackerOnboarding rendering with partnerCode:', partnerCode);

  const handleContinue = async () => {
    if (step === 'welcome') {
      setStep('cycle-basics');
    } else if (step === 'cycle-basics') {
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

      setError('');
      if (isPartner) {
        handleComplete();
      } else {
        setStep('schedule');
      }
    } else if (step === 'schedule') {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!lastPeriodDate) {
      setError('Please enter your last period date');
      setStep('period-date');
      return;
    }
    const parsedStart = parseDateFromInput(lastPeriodDate);
    const parsedEnd = endDate ? parseDateFromInput(endDate) : undefined;

    setLoading(true);
    setError('');
    try {
      await cycleService.recordPeriodStart(
        userId, 
        parsedStart, 
        parsedEnd, 
        scheduleConstraints,
        cycleLengthDays,
        typicalPeriodLengthDays
      );
      onComplete();
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
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
                <div className="flex justify-center mb-6">
                  <img src="/pwa-192x192.png" alt="Phase Logo" className="w-16 h-16 sm:w-24 sm:h-24 mix-blend-multiply hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2 tracking-tight">
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
          {step === 'cycle-basics' && (
            <motion.div
              key="cycle-basics"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-sage-100 to-sage-200 mb-4 shadow-soft">
                  <Clock className="w-6 h-6 text-sage-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2 tracking-tight">
                  Your Cycle Basics
                </h2>
                <p className="text-sm text-earth-600">
                  Help us personalize your predictions
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-3">
                    <span>Typical Cycle Length</span>
                    <span className="text-sage-600 font-bold">{cycleLengthDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="21"
                    max="45"
                    value={cycleLengthDays}
                    onChange={(e) => setCycleLengthDays(parseInt(e.target.value))}
                    className="w-full h-2 bg-earth-200 rounded-lg appearance-none cursor-pointer accent-sage-500"
                  />
                  <div className="flex justify-between text-[10px] text-earth-400 mt-2">
                    <span>21 Days</span>
                    <span>45 Days</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 mb-3">
                    <span>Average Period Length</span>
                    <span className="text-sage-600 font-bold">{typicalPeriodLengthDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={typicalPeriodLengthDays}
                    onChange={(e) => setTypicalPeriodLengthDays(parseInt(e.target.value))}
                    className="w-full h-2 bg-earth-200 rounded-lg appearance-none cursor-pointer accent-sage-500"
                  />
                  <div className="flex justify-between text-[10px] text-earth-400 mt-2">
                    <span>2 Days</span>
                    <span>10 Days</span>
                  </div>
                </div>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleContinue}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
              >
                Next
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
                        endDateObj.setDate(startDateObj.getDate() + (typicalPeriodLengthDays - 1));
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
                    Next
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {step === 'schedule' && (
            <motion.div
              key="schedule"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <motion.button
                  type="button"
                  onClick={() => setStep('period-date')}
                  className="flex items-center gap-2 text-sage-600 hover:text-sage-700 text-sm font-medium mb-4 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 mb-4 shadow-soft">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800 mb-2 tracking-tight">
                  Your Daily Schedule
                </h2>
                <p className="text-sm text-earth-600">
                  We'll tailor wellness tips to your routine
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
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
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 opacity-100 ${
                        isSelected
                          ? 'border-sage-400 bg-sage-50 shadow-sm'
                          : 'border-earth-200 bg-white hover:border-sage-200 hover:bg-sage-50/30'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center shadow-sm"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        isSelected ? 'bg-sage-200' : 'bg-earth-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-sage-700' : 'text-earth-500'}`} />
                      </div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-sage-800' : 'text-slate-700'}`}>
                        {schedule.label}
                      </div>
                      <div className="text-xs text-earth-500 mt-1 leading-tight">
                        {schedule.description}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleComplete}
                disabled={loading}
                whileHover={loading ? {} : { y: -2 }}
                whileTap={loading ? {} : buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Complete Setup
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