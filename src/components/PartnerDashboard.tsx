import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Settings as SettingsIcon, Lightbulb, Heart, ChevronRight, Activity, Droplets, History, Edit3 } from 'lucide-react';
import { db } from '../services/firebase';
import { CycleData, TrackerProfile, PartnerProfile, DailyLog } from '../types';
import { cycleService } from '../services/cycle';
import { CycleCalendar } from './CycleCalendar';
import { CycleHistory } from './CycleHistory';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import { getPartnerSuggestions } from '../data/suggestions';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';
import { PHASE_COLORS, PHASE_LABELS } from '../constants/phases';
interface PartnerDashboardProps {
  userId: string;
  linkedTrackerId?: string;
  isManualMode: boolean;
  onLogSymptoms?: () => void;
  onLogPeriod?: () => void;
}

export function PartnerDashboard({
  userId,
  linkedTrackerId,
  isManualMode,
  onLogSymptoms,
  onLogPeriod,
}: PartnerDashboardProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingCycle, setLoadingCycle] = useState(true);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);

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

    // Fetch the logged-in partner's own profile for preferences
    const fetchPartnerProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'partnerProfiles', userId));
        if (snap.exists()) setPartnerProfile(snap.data() as PartnerProfile);
      } catch (err) {
        console.error('Error fetching partner profile:', err);
      }
    };
    fetchPartnerProfile();
  }, [userId, linkedTrackerId]);

  // Sync Recent Activity (Last 7 Days)
  useEffect(() => {
    const trackerIdToUse = linkedTrackerId || userId;
    const unsubscribe = cycleService.onRecentLogsChange(trackerIdToUse, 7, (logs) => {
      setRecentLogs(logs);
      
      const today = getToday();
      const todayLog = logs.find(log => normalizeDate(log.date).toDateString() === today.toDateString());
      setTodayScore(todayLog ? todayLog.symptomScore : null);
    });

    return () => unsubscribe();
  }, [userId, linkedTrackerId]);

  const currentPhase = useMemo(() => {
    if (!cycleData) return 'pending';
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);

    // High-priority Stale Check (Freeze at Day 56+)
    if (dayOfCycle > 55) return 'out-of-cycle';

    let phase = 'future';

    // 1. Current Menstrual Phase
    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) phase = 'menstrual';
    }
    
    // 2. Predicted Period Window (Awaiting vs Delayed)
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextStart && today <= nextEnd && phase === 'future') phase = 'period-expected';
      if (today > nextEnd && phase === 'future') phase = 'extended-follicular'; // Acts as "Delayed"
    }

    // 3. Other Phases (Priority lower than active period)
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

    // 4. Default Fallbacks (if no specific phase detected)
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
        else if (dayOfCycle > expectedOvulationDay + 16) phase = 'follicular';
      }
    }
    return phase;
  }, [cycleData, cycleData?.lastPeriodDate, cycleData?.ovulationDetectedDate, cycleData?.nextMenstrualPhaseEnd]);

  // Auto-load suggestions whenever phase or profile is ready
  useEffect(() => {
    if (!cycleData || currentPhase === 'pending') return;
    const supportStyles = partnerProfile?.supportStyles || ['emotional-support'];
    const schedule = partnerProfile?.dailyScheduleConstraints || 'flexible';
    
    // Partners ALWAYS get partner suggestions (support perspective)
    const newSuggestions = getPartnerSuggestions(currentPhase, supportStyles, schedule);
    setSuggestions(newSuggestions);
  }, [currentPhase, partnerProfile, isManualMode]);

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
                ? 'Your cycle baseline is not set. Please complete the setup to begin tracking.'
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
          <div className="flex gap-2">
            <motion.button
              onClick={() => setShowHistory(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-earth-200 text-earth-500 hover:text-sage-600 transition-colors duration-200 opacity-100 shadow-soft"
            >
              <History className="w-5 h-5" />
            </motion.button>
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
          </div>
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
            <div className={`w-2 h-2 rounded-full ${colors.vibrantBg}`} />
            <span className="text-earth-600">
              {currentPhase === 'out-of-cycle' ? 'Out of Cycle' : (isManualMode ? `Day ${cycleData.dayOfCycle} of your cycle` : `Day ${calculateDayOfCycle(normalizeDate(cycleData.lastPeriodDate))} of the cycle`)}
            </span>
          </div>
        </motion.div>

        {/* Cycle Info Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          {cycleData.lastPeriodDate && (
            <motion.div
              onClick={() => isManualMode && setShowEditPeriod(true)}
              whileHover={isManualMode ? { y: -2 } : {}}
              whileTap={isManualMode ? buttonTap : {}}
              className={`bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-soft border border-earth-100 transition-all duration-300 opacity-100 ${
                isManualMode ? 'cursor-pointer hover:shadow-soft-lg' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-2 text-earth-400 mb-2">
                <Droplets className="w-4 h-4" />
                <span className="text-xs font-medium">Last Period</span>
              </div>
              <div className="font-semibold text-slate-800">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </div>
              {isManualMode && (
                <div className="flex items-center gap-1 text-xs text-sage-500 mt-1">
                  <Edit3 className="w-3 h-3" />
                  <span>tap to edit</span>
                </div>
              )}
            </motion.div>
          )}

          {cycleData.nextPeriodDate ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-soft border border-earth-100 opacity-100">
              <div className="flex items-center gap-2 text-earth-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Next Period</span>
              </div>
              <div className="font-semibold text-slate-800">
                {formatDateForDisplay(cycleData.nextPeriodDate)}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-soft border border-earth-100 opacity-100 flex flex-col justify-center items-center">
              <div className="text-xs text-earth-400 font-medium">Next Period</div>
              <div className="font-semibold text-earth-400">Pending</div>
            </div>
          )}
        </motion.div>

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

        {/* Recent Activity Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100 opacity-100"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
            <Activity className="w-4 h-4 text-sage-500" />
            <span>Recent Activity</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-earth-100 font-outfit">
              <span className="text-earth-600 text-sm">Today's Score</span>
              <span className="font-semibold text-slate-800">
                {todayScore !== null ? `${todayScore}/10` : 'Not logged'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-earth-100 font-outfit">
              <span className="text-earth-600 text-sm">Last Logged</span>
              <span className="font-semibold text-slate-800">
                {recentLogs.length > 0 ? formatDateForDisplay(normalizeDate(recentLogs[0].date)) : 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 gap-4 font-outfit">
              <span className="text-earth-600 text-sm flex-shrink-0">Ovulation Status</span>
              {(() => {
                const today = getToday();
                if (cycleData.ovulationDetectedDate) {
                  return <span className="font-semibold text-sage-600 text-right leading-tight">Confirmed via Symptoms</span>;
                } else if (cycleData.ovulationPhaseEnd && today > normalizeDate(cycleData.ovulationPhaseEnd)) {
                  return <span className="font-semibold text-amber-500 text-right leading-tight">Past Predicted Window</span>;
                } else if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd && today >= normalizeDate(cycleData.ovulationPhaseStart) && today <= normalizeDate(cycleData.ovulationPhaseEnd)) {
                  return <span className="font-semibold text-rose-400 text-right leading-tight">In Fertile Window</span>;
                } else {
                  return <span className="font-semibold text-earth-400 text-right leading-tight">Awaiting</span>;
                }
              })()}
            </div>
          </div>
        </motion.div>

        {/* AI Suggestions Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Daily Suggestions</span>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3">
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
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="space-y-3">
          {isManualMode && onLogSymptoms && (
            <motion.button
              onClick={onLogSymptoms}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
            >
              <Activity className="w-5 h-5" />
              Log Symptoms
            </motion.button>
          )}
          {isManualMode && onLogPeriod && (
            <motion.button
              onClick={onLogPeriod}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="w-full bg-white/80 backdrop-blur border-2 border-earth-200 hover:border-sage-300 text-slate-700 font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
            >
              <Droplets className="w-5 h-5 text-rose-400" />
              Log Period Start
            </motion.button>
          )}
        </motion.div>

        {/* Modals */}
        <AnimatePresence>
          {showCalendar && cycleData && (
            <CycleCalendar
              cycleData={cycleData}
              cycleLengthDays={cycleLengthDays}
              onClose={() => setShowCalendar(false)}
            />
          )}

          {showHistory && (
            <CycleHistory 
              userId={linkedTrackerId || userId} 
              onClose={() => setShowHistory(false)} 
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