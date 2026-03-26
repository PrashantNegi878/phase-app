import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Settings as SettingsIcon, Droplets, Edit3, Share2, Activity, ChevronRight, Heart, Lightbulb } from 'lucide-react';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData, TrackerProfile } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import { DailyLog } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';
import { getSelfSuggestions } from '../data/suggestions';

interface TrackerDashboardProps {
  userId: string;
  partnerCode: string;
  onLogSymptoms: () => void;
  onLogPeriod: () => void;
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
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [hasLinkedPartner, setHasLinkedPartner] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trackerProfile, setTrackerProfile] = useState<TrackerProfile | null>(null);

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
    const fetchTrackerProfile = async () => {
      try {
        const unsubscribe = onSnapshot(
          doc(db, 'trackerProfiles', userId),
          (docSnap) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as TrackerProfile;
              setTrackerProfile(profile);
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

    const unsubscribePartner = cycleService.onLinkedPartnersChange(userId, (hasPartner) => {
      setHasLinkedPartner(hasPartner);
    });

    return () => unsubscribePartner();
  }, [userId]);

  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const logs = await cycleService.getRecentLogs(userId, 7);
        setRecentLogs(logs);
        const today = new Date();
        const todayLog = logs.find(log => {
          const logDate = new Date(log.date);
          return logDate.toDateString() === today.toDateString();
        });
        setTodayScore(todayLog ? todayLog.symptomScore : null);
      } catch (error) {
        console.error('Error fetching recent logs:', error);
      }
    };
    fetchRecentLogs();
  }, [userId]);

  const currentDayOfCycle = useMemo(() => {
    if (!cycleData?.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData?.lastPeriodDate]);

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

  // Auto-load suggestions whenever phase or profile is ready
  useEffect(() => {
    if (!cycleData || currentPhase === 'pending') return;
    // Use an interface cast to ensure TS recognizes the property we just added to the type
    const profile = trackerProfile as TrackerProfile;
    const schedule = profile?.dailyScheduleConstraints || 'flexible';
    const newSuggestions = getSelfSuggestions(currentPhase, schedule);
    setSuggestions(newSuggestions);
  }, [currentPhase, trackerProfile, cycleData]);

  if (loading) {
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
        <div className="max-w-md mx-auto mt-12 bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-lg p-8 text-center">
          <p className="text-earth-600">No cycle data available. Please start logging.</p>
        </div>
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
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Overview</h1>
            <div className="flex flex-col items-start gap-1 mt-1">
              <p className="text-sm text-earth-500">Personal tracking mode</p>
              {hasLinkedPartner && (
                <div className="flex items-center gap-1.5 text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full border border-sage-100">
                  <Heart className="w-3 h-3 fill-current" />
                  <span className="text-xs font-medium">Partner Connected</span>
                </div>
              )}
            </div>
          </div>
          <motion.button
            onClick={() => setShowSettings(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={buttonTap}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-earth-200 text-earth-500 hover:text-sage-600 transition-colors duration-200 opacity-100 shadow-soft"
          >
            <SettingsIcon className="w-5 h-5" />
          </motion.button>
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
            <span className="text-earth-600">Day {currentDayOfCycle} of your cycle</span>
          </div>
        </motion.div>

        {/* Cycle Info Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          {cycleData.lastPeriodDate && (
            <motion.div
              onClick={() => setShowEditPeriod(true)}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-soft cursor-pointer hover:shadow-soft-lg transition-all duration-300 opacity-100 border border-earth-100"
            >
              <div className="flex items-center gap-2 text-earth-400 mb-2">
                <Droplets className="w-4 h-4" />
                <span className="text-xs font-medium">Last Period</span>
              </div>
              <div className="font-semibold text-slate-800">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </div>
              <div className="flex items-center gap-1 text-xs text-sage-500 mt-1">
                <Edit3 className="w-3 h-3" />
                <span>tap to edit</span>
              </div>
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
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-soft border border-earth-100 opacity-100">
              <div className="flex items-center gap-2 text-earth-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Next Period</span>
              </div>
              <div className="font-semibold text-earth-400">Pending</div>
            </div>
          )}
        </motion.div>

        {/* Daily Suggestions */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100 opacity-100"
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

        {/* Partner Code Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100 opacity-100"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
            <Share2 className="w-4 h-4 text-sage-500" />
            <span>Partner Code</span>
          </div>
          <div className="bg-gradient-to-r from-sage-50 to-earth-50 border border-sage-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-sage-700 tracking-widest font-mono">
              {partnerCode}
            </p>
          </div>
          <p className="text-xs text-earth-500 mt-3 text-center">
            Share this code with your partner to connect
          </p>
        </motion.div>

        {/* Recent Symptoms Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-soft mb-6 border border-earth-100 opacity-100"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
            <Activity className="w-4 h-4 text-sage-500" />
            <span>Recent Activity</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-earth-100">
              <span className="text-earth-600 text-sm">Today's Score</span>
              <span className="font-semibold text-slate-800">
                {todayScore !== null ? `${todayScore}/10` : 'Not logged'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-earth-100">
              <span className="text-earth-600 text-sm">Last Logged</span>
              <span className="font-semibold text-slate-800">
                {recentLogs.length > 0 ? formatDateForDisplay(new Date(recentLogs[0].date)) : 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 gap-4">
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

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="space-y-3">
          <motion.button
            onClick={onLogSymptoms}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" />
            Log Symptoms
          </motion.button>
          <motion.button
            onClick={onLogPeriod}
            whileHover={{ y: -2 }}
            whileTap={buttonTap}
            className="w-full bg-white/80 backdrop-blur border-2 border-earth-200 hover:border-sage-300 text-slate-700 font-semibold py-4 rounded-2xl transition-all duration-300 opacity-100 shadow-soft hover:shadow-soft-lg flex items-center justify-center gap-2"
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