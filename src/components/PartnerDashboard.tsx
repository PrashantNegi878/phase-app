import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Settings as SettingsIcon, Lightbulb, Heart, ChevronRight, Activity, Droplets, Sparkles } from 'lucide-react';
import { db } from '../services/firebase';
import { CycleData, TrackerProfile } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import axios from 'axios';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';

interface PartnerDashboardProps {
  userId: string;
  linkedTrackerId?: string;
  isManualMode: boolean;
  onLogSymptoms?: () => void;
  onLogPeriod?: () => void;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; light: string; gradient: string }> = {
  menstrual: { bg: 'bg-rose-400', text: 'text-rose-600', light: 'bg-rose-50', gradient: 'from-rose-100 to-rose-50' },
  follicular: { bg: 'bg-sage-500', text: 'text-sage-700', light: 'bg-sage-50', gradient: 'from-sage-100 to-sage-50' },
  ovulation: { bg: 'bg-amber-400', text: 'text-amber-600', light: 'bg-amber-50', gradient: 'from-amber-100 to-amber-50' },
  luteal: { bg: 'bg-earth-500', text: 'text-earth-700', light: 'bg-earth-100', gradient: 'from-earth-200 to-earth-100' },
  'extended-follicular': { bg: 'bg-sage-400', text: 'text-sage-600', light: 'bg-sage-50', gradient: 'from-sage-100 to-sage-50' },
  pending: { bg: 'bg-earth-300', text: 'text-earth-600', light: 'bg-earth-50', gradient: 'from-earth-100 to-earth-50' },
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal Phase',
  'extended-follicular': 'Extended Follicular',
  pending: 'Pending Data',
};

export function PartnerDashboard({
  userId,
  linkedTrackerId,
  isManualMode,
  onLogSymptoms,
  onLogPeriod,
}: PartnerDashboardProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingCycle, setLoadingCycle] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if ((isManualMode && userId) || (!isManualMode && linkedTrackerId)) {
      try {
        const docRef = isManualMode
          ? doc(db, 'cycleData', userId)
          : doc(db, 'cycleData', linkedTrackerId!);
        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setCycleData(docSnap.data() as CycleData);
            } else {
              setCycleData(null);
            }
            setLoadingCycle(false);
          },
          (error) => {
            console.error('Error listening to cycle data:', error);
            setError('Failed to load cycle data');
            setLoadingCycle(false);
          }
        );
      } catch (err) {
        console.error('Error setting up listener:', err);
        setError('Failed to load cycle data');
        setLoadingCycle(false);
      }
    } else {
      setLoadingCycle(false);
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [userId, linkedTrackerId, isManualMode]);

  useEffect(() => {
    const trackerIdToUse = linkedTrackerId || userId;
    const fetchTrackerProfile = async () => {
      try {
        const unsubscribe = onSnapshot(
          doc(db, 'trackerProfiles', trackerIdToUse),
          (docSnap) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as TrackerProfile;
              setCycleLengthDays(profile.cycleLengthDays || 28);
            }
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching tracker profile:', error);
      }
    };
    fetchTrackerProfile();
  }, [userId, linkedTrackerId]);

  const handleGetSuggestions = async () => {
    if (!cycleData) return;
    setLoadingSuggestions(true);
    setError('');
    try {
      const response = await axios.post('/api/suggestion', {
        cyclePhase: currentPhase,
        userId: userId,
      });
      setSuggestions(response.data.suggestions);
    } catch (err) {
      setError('This feature is currently unavailable. Please try again later.');
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const currentPhase = useMemo(() => {
    if (!cycleData) return 'pending';
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    let phase = 'future';

    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) phase = 'menstrual';
    }
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextMenstrualStart && today <= nextMenstrualEnd) phase = 'menstrual';
    }
    if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
      const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
      const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
      if (today >= follicularStart && today <= follicularEnd && phase === 'future') phase = 'follicular';
    }
    if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
      const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
      const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
      if (today >= ovulationStart && today <= ovulationEnd && phase === 'future') phase = 'ovulation';
    }
    if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
      const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
      const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
      if (today >= lutealStart && today <= lutealEnd && phase === 'future') phase = 'luteal';
    }
    if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
      const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
      const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
      if (today >= extendedStart && today <= extendedEnd && phase === 'future') phase = 'extended-follicular';
    }

    if (phase === 'future') {
      if (cycleData.ovulationDetectedDate) {
        const ovulationDate = normalizeDate(cycleData.ovulationDetectedDate);
        const ovDay = calculateDayOfCycleForDate(ovulationDate, lastPeriod);
        if (dayOfCycle <= 5) phase = 'menstrual';
        else if (dayOfCycle > 5 && dayOfCycle < ovDay) phase = 'follicular';
        else if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) phase = 'ovulation';
        else if (dayOfCycle >= ovDay + 3) phase = 'luteal';
      } else {
        const expectedOvulationDay = Math.round(28 / 2);
        if (dayOfCycle <= 5) phase = 'menstrual';
        else if (dayOfCycle > 5 && dayOfCycle < expectedOvulationDay) phase = 'follicular';
        else if (dayOfCycle >= expectedOvulationDay && dayOfCycle < expectedOvulationDay + 3) phase = 'ovulation';
        else if (dayOfCycle >= expectedOvulationDay + 3 && dayOfCycle <= expectedOvulationDay + 16) phase = 'luteal';
        else if (dayOfCycle > expectedOvulationDay + 16 && dayOfCycle >= 20) phase = 'extended-follicular';
        else if (dayOfCycle > expectedOvulationDay + 16) phase = 'follicular';
      }
    }
    return phase;
  }, [cycleData, cycleData?.lastPeriodDate, cycleData?.ovulationDetectedDate, cycleData?.nextMenstrualPhaseEnd]);

  const colors = PHASE_COLORS[currentPhase] || PHASE_COLORS.pending;
  const phaseLabel = PHASE_LABELS[currentPhase] || 'Unknown Phase';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  };
  const buttonTap = { scale: 0.97 };

  if (loadingCycle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50 to-earth-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
          <p className="text-earth-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50 to-earth-100 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mt-12 bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-lg p-8"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-sage-200 to-sage-300 mb-4 shadow-soft">
              <Heart className="w-8 h-8 text-sage-700" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Get Started</h2>
            <p className="text-earth-600">
              {isManualMode
                ? 'To start tracking, first log when your last period started.'
                : "Your partner hasn't shared their cycle data yet."}
            </p>
          </div>
          {isManualMode && onLogPeriod && (
            <>
              <motion.button
                onClick={onLogPeriod}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl mb-3 transition-colors duration-200 opacity-100 shadow-soft flex items-center justify-center gap-2"
              >
                <Droplets className="w-5 h-5" />
                Log Period Start
              </motion.button>
              <p className="text-xs text-earth-500 text-center">
                Once you log your period, you can track symptoms
              </p>
            </>
          )}
          {!isManualMode && (
            <p className="text-xs text-earth-500 text-center">
              Please ask your partner to log their cycle data first.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50/50 to-earth-100 p-4 pb-28">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6 mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Overview
            </h1>
            <p className="text-sm text-earth-500">
              {isManualMode ? 'Manual tracking mode' : 'Linked to partner'}
            </p>
          </div>
          {isManualMode && (
            <motion.button
              onClick={() => setShowSettings(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-earth-200 text-earth-500 hover:text-sage-600 transition-colors duration-200 opacity-100 shadow-soft"
            >
              <SettingsIcon className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>

        {/* Current Phase Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => setShowCalendar(true)}
          whileHover={{ y: -2 }}
          whileTap={buttonTap}
          className={`bg-gradient-to-br ${colors.gradient} border border-sage-200/50 rounded-3xl p-6 mb-6 cursor-pointer shadow-soft hover:shadow-soft-lg transition-all duration-300 opacity-100`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-earth-500">Current Phase</span>
            <div className="flex items-center gap-1 text-earth-400">
              <Calendar className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-semibold ${colors.text} mb-2 tracking-tight`}>{phaseLabel}</div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
            <span className="text-earth-600">
              Day {isManualMode ? cycleData.dayOfCycle : calculateDayOfCycle(normalizeDate(cycleData.lastPeriodDate))} of the cycle
            </span>
          </div>
        </motion.div>

        {/* Cycle Info */}
        {cycleData.lastPeriodDate && (
          <motion.div
            variants={itemVariants}
            onClick={() => setShowEditPeriod(true)}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 cursor-pointer hover:shadow-soft-lg transition-all duration-300 opacity-100 border border-earth-100"
          >
            <div className="flex items-center gap-2 text-earth-400 mb-2">
              <Droplets className="w-4 h-4" />
              <span className="text-xs font-medium">Last Period</span>
            </div>
            <div className="font-semibold text-slate-800 text-lg">
              {formatDateForDisplay(cycleData.lastPeriodDate)}
            </div>
            <p className="text-xs text-sage-500 mt-1">tap to edit</p>
          </motion.div>
        )}

        {/* Error Message */}
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

        {/* AI Suggestions Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Daily Suggestions</span>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-3 mb-4">
              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gradient-to-r from-sage-50 to-earth-50 border border-sage-200 rounded-xl p-4"
                >
                  <p className="text-slate-700 text-sm leading-relaxed">{suggestion}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-earth-600 text-sm mb-4">
              Get personalized suggestions based on the current cycle phase.
            </p>
          )}

          <motion.button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-3 rounded-xl transition-colors duration-200 opacity-100 shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingSuggestions ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Getting suggestions...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Get Suggestions
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Manual Mode: Log Symptoms */}
        {isManualMode && onLogSymptoms && (
          <motion.button
            variants={itemVariants}
            onClick={onLogSymptoms}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-white/80 backdrop-blur border-2 border-earth-200 hover:border-sage-300 text-slate-700 font-semibold py-4 rounded-2xl transition-all duration-200 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5 text-sage-500" />
            Log Symptoms
          </motion.button>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showCalendar && cycleData && (
            <CycleCalendar
              cycleData={cycleData}
              cycleLengthDays={cycleLengthDays}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </AnimatePresence>

        {showSettings && (
          <Settings userId={userId} onBack={() => setShowSettings(false)} />
        )}

        {showEditPeriod && (
          <EditPeriod
            userId={userId}
            onEditComplete={() => setShowEditPeriod(false)}
            onCancel={() => setShowEditPeriod(false)}
          />
        )}
      </motion.div>
    </div>
  );
}