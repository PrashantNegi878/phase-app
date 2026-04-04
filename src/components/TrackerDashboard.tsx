import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Settings as SettingsIcon, 
  Droplets, 
  Edit3, 
  Share2, 
  Activity, 
  ChevronRight, 
  Heart, 
  Lightbulb,
  History 
} from 'lucide-react';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData, TrackerProfile, DailyLog } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { CycleHistory } from './CycleHistory';
import { EditPeriod } from './EditPeriod';
import { getToday, normalizeDate, formatDateForDisplay } from '../utils/dateUtils';
import { getSelfSuggestions } from '../data/suggestions';
import { STALE_CYCLE_THRESHOLD_DAYS } from '../constants/cycle';
import { PHASE_COLORS, PHASE_LABELS } from '../constants/phases';

interface TrackerDashboardProps {
  userId: string;
  partnerCode: string;
  onLogSymptoms: () => void;
  onLogPeriod: () => void;
}

export function TrackerDashboard({
  userId,
  partnerCode,
  onLogSymptoms,
  onLogPeriod,
}: TrackerDashboardProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [hasLinkedPartner, setHasLinkedPartner] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trackerProfile, setTrackerProfile] = useState<TrackerProfile | null>(null);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(partnerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'cycleData', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CycleData;
          setCycleData(data);
        } else {
          setCycleData(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to cycle data:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const unsubscribeProfile = onSnapshot(
      doc(db, 'trackerProfiles', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as TrackerProfile;
          setTrackerProfile(profile);
          setCycleLengthDays(profile.cycleLengthDays || 28);
        }
      },
      (error) => {
        console.error('Error fetching tracker profile:', error);
      }
    );

    const unsubscribePartner = cycleService.onLinkedPartnersChange(userId, (hasPartner) => {
      setHasLinkedPartner(hasPartner);
    });

    return () => {
      unsubscribeProfile();
      unsubscribePartner();
    };
  }, [userId]);

  useEffect(() => {
    const unsubscribe = cycleService.onRecentLogsChange(userId, 7, (logs) => {
      setRecentLogs(logs);
      const today = new Date();
      const todayLog = logs.find(log => {
        const logDate = normalizeDate(log.date);
        return logDate.toDateString() === today.toDateString();
      });
      setTodayScore(todayLog ? todayLog.symptomScore : null);
    });
    
    return () => unsubscribe();
  }, [userId]);

  const currentDayOfCycle = useMemo(() => {
    if (!cycleData?.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData?.lastPeriodDate]);

  const currentPhase = useMemo(() => {
    if (!cycleData) return 'pending';
    const today = getToday();
    
    if (currentDayOfCycle > 55) return 'out-of-cycle';

    let phase = 'future';

    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) phase = 'menstrual';
    }
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextMenstrualStart && today <= nextMenstrualEnd) phase = 'period-expected';
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

    if (phase === 'future') {
      const today = getToday();
      
      if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd && 
          today >= normalizeDate(cycleData.menstrualPhaseStart) && today <= normalizeDate(cycleData.menstrualPhaseEnd)) {
        phase = 'menstrual';
      } else if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd && 
                 today >= normalizeDate(cycleData.follicularPhaseStart) && today <= normalizeDate(cycleData.follicularPhaseEnd)) {
        phase = 'follicular';
      } else if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd && 
                 today >= normalizeDate(cycleData.ovulationPhaseStart) && today <= normalizeDate(cycleData.ovulationPhaseEnd)) {
        phase = 'ovulation';
      } else if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd && 
                 today >= normalizeDate(cycleData.lutealPhaseStart) && today <= normalizeDate(cycleData.lutealPhaseEnd)) {
        phase = 'luteal';
      } else if (currentDayOfCycle > cycleLengthDays) {
        phase = currentDayOfCycle > STALE_CYCLE_THRESHOLD_DAYS ? 'out-of-cycle' : 'extended-follicular';
      }
    }
    return phase;
  }, [cycleData, currentDayOfCycle, cycleLengthDays]);

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

  useEffect(() => {
    if (!cycleData || currentPhase === 'pending') return;
    const profile = trackerProfile as TrackerProfile;
    const schedule = profile?.dailyScheduleConstraints || 'flexible';
    const newSuggestions = getSelfSuggestions(currentPhase, schedule);
    setSuggestions(newSuggestions);
  }, [currentPhase, trackerProfile, cycleData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-sage-200 dark:border-sage-900 border-t-sage-500 rounded-full animate-spin" />
          <p className="text-text-muted font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-app-bg p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card-bg rounded-3xl shadow-soft-lg p-8 border border-border-subtle text-center"
        >
          <p className="text-text-muted">No cycle data available. Please start logging.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg p-4 pb-28 transition-colors duration-300">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6 mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-main tracking-tight">Overview</h1>
            <div className="flex flex-col items-start gap-1 mt-1">
              <p className="text-sm text-text-muted">Personal tracking mode</p>
              {hasLinkedPartner && (
                <div className="flex items-center gap-1.5 text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/30 px-2 py-0.5 rounded-full border border-sage-100 dark:border-sage-800">
                  <Heart className="w-3 h-3 fill-current" />
                  <span className="text-xs font-medium">Partner Connected</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={() => setShowHistory(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-card-bg/80 border border-border-subtle text-text-muted hover:text-sage-600 dark:hover:text-sage-400 transition-colors duration-200 shadow-soft"
            >
              <History className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => setShowSettings(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-card-bg/80 border border-border-subtle text-text-muted hover:text-sage-600 dark:hover:text-sage-400 transition-colors duration-200 shadow-soft"
            >
              <SettingsIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Current Phase Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => setShowCalendar(true)}
          whileHover={{ y: -2 }}
          whileTap={buttonTap}
          className={`bg-gradient-to-br ${colors.gradient} border border-sage-200/50 dark:border-sage-400/20 rounded-3xl p-6 mb-6 cursor-pointer shadow-soft hover:shadow-soft-lg transition-all duration-300 opacity-100`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-text-muted opacity-80">Current Phase</span>
            <div className="flex items-center gap-1 text-text-muted opacity-60">
              <Calendar className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-semibold ${colors.text} mb-2 tracking-tight`}>{phaseLabel}</div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${colors.vibrantBg}`} />
            <span className="text-text-muted">
              {currentPhase === 'out-of-cycle' ? 'Out of Cycle' : `Day ${currentDayOfCycle} of your cycle`}
            </span>
          </div>
        </motion.div>

        {/* Cycle Info Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          {cycleData.lastPeriodDate && (
            <motion.div
              onClick={() => setShowEditPeriod(true)}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="bg-card-bg rounded-2xl p-4 shadow-soft cursor-pointer hover:shadow-soft-lg transition-all duration-300 border border-border-subtle"
            >
              <div className="flex items-center gap-2 text-text-muted opacity-80 mb-2">
                <Droplets className="w-4 h-4" />
                <span className="text-xs font-medium">Last Period</span>
              </div>
              <div className="font-semibold text-text-main">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </div>
              <div className="flex items-center gap-1 text-xs text-sage-500 mt-1">
                <Edit3 className="w-3 h-3" />
                <span>tap to edit</span>
              </div>
            </motion.div>
          )}
          {cycleData.nextPeriodDate ? (
            <div className="bg-card-bg rounded-2xl p-4 shadow-soft border border-border-subtle">
              <div className="flex items-center gap-2 text-text-muted opacity-80 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Next Period</span>
              </div>
              <div className="font-semibold text-text-main">
                {formatDateForDisplay(cycleData.nextPeriodDate)}
              </div>
            </div>
          ) : (
            <div className="bg-card-bg rounded-2xl p-4 shadow-soft border border-border-subtle">
              <div className="flex items-center gap-2 text-text-muted opacity-80 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Next Period</span>
              </div>
              <div className="font-semibold text-text-muted opacity-50">Pending</div>
            </div>
          )}
        </motion.div>

        {/* Daily Suggestions */}
        <motion.div
          variants={itemVariants}
          className="bg-card-bg rounded-2xl p-5 shadow-soft mb-6 border border-border-subtle"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-text-main mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span className="text-text-main">Daily Suggestions</span>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-app-bg dark:bg-slate-800/40 border border-border-subtle rounded-xl p-4"
                >
                  <p className="text-text-main/90 text-sm leading-relaxed">{suggestion}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div
          variants={itemVariants}
          className="bg-card-bg rounded-2xl p-5 shadow-soft mb-6 border border-border-subtle"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-text-main mb-4">
            <Activity className="w-4 h-4 text-sage-500" />
            <span>Recent Activity</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-text-muted text-sm">Today's Score</span>
              <span className="font-semibold text-text-main">
                {todayScore !== null ? `${todayScore}/10` : 'Not logged'}
              </span>
            </div>
            {hasLinkedPartner && (
              <div className="flex justify-between items-center py-2 border-b border-border-subtle">
                <span className="text-text-muted text-sm">Partner Connection</span>
                <div className="flex items-center gap-1.5 text-sage-600 dark:text-sage-400">
                  <Heart className="w-3 h-3 fill-current" />
                  <span className="text-sm font-medium">Linked</span>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-border-subtle">
              <span className="text-text-muted text-sm">Last Logged</span>
              <span className="font-semibold text-text-main">
                {recentLogs.length > 0 ? formatDateForDisplay(normalizeDate(recentLogs[0].date)) : 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 gap-4">
              <span className="text-text-muted text-sm flex-shrink-0">Ovulation Status</span>
              {(() => {
                const today = getToday();
                if (cycleData.ovulationDetectedDate) {
                  return <span className="font-semibold text-sage-600 dark:text-sage-400 text-right leading-tight">Confirmed via Symptoms</span>;
                } else if (cycleData.ovulationPhaseEnd && today > normalizeDate(cycleData.ovulationPhaseEnd)) {
                  return <span className="font-semibold text-amber-500 text-right leading-tight">Past Predicted Window</span>;
                } else if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd && today >= normalizeDate(cycleData.ovulationPhaseStart) && today <= normalizeDate(cycleData.ovulationPhaseEnd)) {
                  return <span className="font-semibold text-rose-400 text-right leading-tight">In Fertile Window</span>;
                } else {
                  return <span className="font-semibold text-text-muted opacity-50 text-right leading-tight">Awaiting</span>;
                }
              })()}
            </div>
          </div>
        </motion.div>

        {/* Partner Code Section */}
        <motion.div
          variants={itemVariants}
          className="bg-card-bg rounded-2xl p-5 shadow-soft mb-6 border border-border-subtle"
        >
          <div className="flex items-center justify-between gap-2 text-sm font-medium text-text-main mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-sage-500" />
              <span>Partner Code</span>
            </div>
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[10px] font-bold text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/30 px-2 py-0.5 rounded-full border border-sage-100 dark:border-sage-800"
                >
                  Copied
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            onClick={handleCopyCode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-app-bg dark:bg-slate-800/40 border border-border-subtle rounded-xl p-4 text-center cursor-pointer hover:bg-sage-50/50 dark:hover:bg-sage-900/10 transition-colors group relative"
          >
            <p className="text-3xl font-bold text-sage-700 dark:text-sage-400 tracking-widest font-mono group-active:scale-95 transition-transform">
              {partnerCode}
            </p>
          </motion.button>
          <p className="text-xs text-text-muted mt-3 text-center">
            Tap the code to copy and share with your partner
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="space-y-3">
          <motion.button
            onClick={onLogSymptoms}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" />
            Log Symptoms
          </motion.button>
          <motion.button
            onClick={onLogPeriod}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-card-bg border-2 border-border-subtle hover:border-sage-300 dark:hover:border-sage-700 text-text-main font-semibold py-4 rounded-2xl focus:shadow-soft flex items-center justify-center gap-2"
          >
            <Droplets className="w-5 h-5 text-rose-400" />
            Log Period Start
          </motion.button>
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
        </AnimatePresence>

        {showSettings && (
          <Settings userId={userId} onBack={() => setShowSettings(false)} />
        )}

        <AnimatePresence>
          {showHistory && (
            <CycleHistory userId={userId} onClose={() => setShowHistory(false)} />
          )}
        </AnimatePresence>

        {showEditPeriod && (
          <EditPeriod
            userId={userId}
            trackerProfile={trackerProfile}
            onEditComplete={() => setShowEditPeriod(false)}
            onCancel={() => setShowEditPeriod(false)}
          />
        )}
      </motion.div>
    </div>
  );
}