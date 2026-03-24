import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Calendar, ArrowRight, Share2 } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { parseDateFromInput, formatDateForDisplay } from '../utils/dateUtils';

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
  const [step, setStep] = useState<'welcome' | 'symptoms' | 'period-date'>('welcome');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug log to confirm component is rendering
  console.log('TrackerOnboarding rendering with partnerCode:', partnerCode);

  const symptomOptions = [
    { id: 'cervical-fluid', label: 'Cervical Fluid', description: 'Track consistency changes' },
    { id: 'bbt', label: 'Basal Body Temperature', description: 'Track temperature patterns' },
    { id: 'cramps', label: 'Cramps', description: 'Track pain levels' },
    { id: 'mood', label: 'Mood', description: 'Track emotional changes' },
  ];

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((s) => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleContinue = async () => {
    if (step === 'symptoms') {
      if (selectedSymptoms.length === 0) {
        setError('Please select at least one symptom to track');
        return;
      }
      setStep('period-date');
    } else if (step === 'period-date') {
      if (!lastPeriodDate) {
        setError('Please enter your last period date');
        return;
      }
      setLoading(true);
      setError('');
      try {
        await cycleService.updateTrackerSymptoms(userId, selectedSymptoms);
        await cycleService.recordPeriodStart(userId, parseDateFromInput(lastPeriodDate));
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
                onClick={() => setStep('symptoms')}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {step === 'symptoms' && (
            <motion.div
              key="symptoms"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <h2 className="text-xl font-semibold text-slate-800 mb-2 tracking-tight">
                  What would you like to track?
                </h2>
                <p className="text-sm text-earth-600">
                  Select the symptoms or metrics you want to monitor
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

              <motion.div variants={itemVariants} className="space-y-3">
                {symptomOptions.map((option) => (
                  <motion.label
                    key={option.id}
                    whileHover={{ y: -2 }}
                    whileTap={buttonTap}
                    className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-colors duration-200 opacity-100 ${
                      selectedSymptoms.includes(option.id)
                        ? 'border-sage-400 bg-sage-50 shadow-soft'
                        : 'border-earth-200 hover:border-sage-300 bg-white/50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 mr-4 flex items-center justify-center transition-colors duration-200 opacity-100 ${
                      selectedSymptoms.includes(option.id)
                        ? 'bg-sage-500 border-sage-500'
                        : 'border-earth-300'
                    }`}>
                      {selectedSymptoms.includes(option.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.includes(option.id)}
                      onChange={() => toggleSymptom(option.id)}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium text-slate-800">{option.label}</div>
                      <div className="text-sm text-earth-500">{option.description}</div>
                    </div>
                  </motion.label>
                ))}
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleContinue}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
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

              <motion.div variants={itemVariants} className="space-y-3">
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-earth-200 rounded-2xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors duration-200 opacity-100 bg-white text-slate-700"
                />
                {lastPeriodDate && (
                  <p className="text-sm text-earth-600">
                    Selected: {formatDateForDisplay(new Date(lastPeriodDate))}
                  </p>
                )}
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleContinue}
                disabled={loading || !lastPeriodDate}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-colors duration-200 opacity-100 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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