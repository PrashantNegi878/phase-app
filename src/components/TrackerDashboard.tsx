import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData, TrackerProfile } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import { DailyLog } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Droplets, 
  Heart, 
  Activity,
  ChevronRight,
  Sparkles,
  Share2,
  Copy
} from 'lucide-react';

interface TrackerDashboardProps {
  userId: string;
  partnerCode: string;
  onLogSymptoms: () => void;
  onLogPeriod: () => void;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; light: string; border: string; icon: string }> = {
  menstrual: { 
    bg: 'bg-phase-menstrual', 
    text: 'text-phase-menstrual', 
    light: 'bg-phase-menstrual-light',
    border: 'border-phase-menstrual/30',
    icon: 'text-phase-menstrual'
  },
  follicular: { 
    bg: 'bg-phase-follicular', 
    text: 'text-phase-follicular', 
    light: 'bg-phase-follicular-light',
    border: 'border-phase-follicular/30',
    icon: 'text-phase-follicular'
  },
  ovulation: { 
    bg: 'bg-phase-ovulation', 
    text: 'text-phase-ovulation', 
    light: 'bg-phase-ovulation-light',
    border: 'border-phase-ovulation/30',
    icon: 'text-phase-ovulation'
  },
  luteal: { 
    bg: 'bg-phase-luteal', 
    text: 'text-phase-luteal', 
    light: 'bg-phase-luteal-light',
    border: 'border-phase-luteal/30',
    icon: 'text-phase-luteal'
  },
  'extended-follicular': {
    bg: 'bg-phase-follicular',
    text: 'text-phase-follicular',
    light: 'bg-phase-follicular-light',
    border: 'border-phase-follicular/30',
    icon: 'text-phase-follicular'
  },
  pending: { 
    bg: 'bg-sage-400', 
    text: 'text-sage-600', 
    light: 'bg-sage-50',
    border: 'border-sage-200',
    icon: 'text-sage-500'
  },
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulation: 'Ovulation',
  luteal: 'Luteal Phase',
  'extended-follicular': 'Extended Follicular',
  pending: 'Pending Data',
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  menstrual: 'Rest and nurture yourself',
  follicular: 'Energy is building',
  ovulation: 'Peak energy window',
  luteal: 'Time to wind down',
  'extended-follicular': 'Extended growth phase',
  pending: 'Log your cycle to begin',
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Set up real-time listener for cycle data
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

  // Fetch tracker profile for cycle length
  useEffect(() => {
    const fetchTrackerProfile = async () => {
      try {
        const unsubscribe = onSnapshot(
          doc(db, 'trackerProfiles', userId),
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
  }, [userId]);

  // Fetch recent symptom logs
  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const logs = await cycleService.getRecentLogs(userId, 7); // Get last 7 days
        setRecentLogs(logs);
        
        // Calculate today's score
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

  // Calculate day of cycle dynamically based on last period date
  const currentDayOfCycle = useMemo(() => {
    if (!cycleData?.lastPeriodDate) return 0;
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    // Calculate day of cycle: today - lastPeriod + 1
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }, [cycleData?.lastPeriodDate]);

  // Calculate phase dynamically based on current date and cycle data
  const currentPhase = useMemo(() => {
    if (!cycleData) return 'pending';
    
    const today = getToday();
    const lastPeriod = normalizeDate(cycleData.lastPeriodDate);
    const dayOfCycle = calculateDayOfCycle(lastPeriod);
    
    // Determine phase based on stored phase dates (same logic as calendar rendering)
    let phase = 'future';
    
    // Check menstrual phase (current cycle)
    if (cycleData.menstrualPhaseStart && cycleData.menstrualPhaseEnd) {
      const menstrualStart = normalizeDate(cycleData.menstrualPhaseStart);
      const menstrualEnd = normalizeDate(cycleData.menstrualPhaseEnd);
      if (today >= menstrualStart && today <= menstrualEnd) {
        phase = 'menstrual';
      }
    }
    
    // Check menstrual phase (next cycle)
    if (cycleData.nextMenstrualPhaseStart && cycleData.nextMenstrualPhaseEnd) {
      const nextMenstrualStart = normalizeDate(cycleData.nextMenstrualPhaseStart);
      const nextMenstrualEnd = normalizeDate(cycleData.nextMenstrualPhaseEnd);
      if (today >= nextMenstrualStart && today <= nextMenstrualEnd) {
        phase = 'menstrual';
      }
    }
    
    // Check follicular phase
    if (cycleData.follicularPhaseStart && cycleData.follicularPhaseEnd) {
      const follicularStart = normalizeDate(cycleData.follicularPhaseStart);
      const follicularEnd = normalizeDate(cycleData.follicularPhaseEnd);
      if (today >= follicularStart && today <= follicularEnd && phase === 'future') {
        phase = 'follicular';
      }
    }
    
    // Check ovulation phase
    if (cycleData.ovulationPhaseStart && cycleData.ovulationPhaseEnd) {
      const ovulationStart = normalizeDate(cycleData.ovulationPhaseStart);
      const ovulationEnd = normalizeDate(cycleData.ovulationPhaseEnd);
      if (today >= ovulationStart && today <= ovulationEnd && phase === 'future') {
        phase = 'ovulation';
      }
    }
    
    // Check luteal phase
    if (cycleData.lutealPhaseStart && cycleData.lutealPhaseEnd) {
      const lutealStart = normalizeDate(cycleData.lutealPhaseStart);
      const lutealEnd = normalizeDate(cycleData.lutealPhaseEnd);
      if (today >= lutealStart && today <= lutealEnd && phase === 'future') {
        phase = 'luteal';
      }
    }
    
    // Check extended follicular phase
    if (cycleData.extendedFollicularPhaseStart && cycleData.extendedFollicularPhaseEnd) {
      const extendedStart = normalizeDate(cycleData.extendedFollicularPhaseStart);
      const extendedEnd = normalizeDate(cycleData.extendedFollicularPhaseEnd);
      if (today >= extendedStart && today <= extendedEnd && phase === 'future') {
        phase = 'extended-follicular';
      }
    }
    
    // If no phase matched, calculate based on day of cycle and ovulation detection
    if (phase === 'future') {
      if (cycleData.ovulationDetectedDate) {
        const ovulationDate = normalizeDate(cycleData.ovulationDetectedDate);
        const ovDay = calculateDayOfCycleForDate(ovulationDate, lastPeriod);
        
        if (dayOfCycle <= 5) {
          phase = 'menstrual';
        } else if (dayOfCycle > 5 && dayOfCycle < ovDay) {
          phase = 'follicular';
        } else if (dayOfCycle >= ovDay && dayOfCycle < ovDay + 3) {
          phase = 'ovulation';
        } else if (dayOfCycle >= ovDay + 3) {
          phase = 'luteal';
        }
      } else {
        // No ovulation detected - use predicted phases
        const expectedOvulationDay = Math.round(28 / 2); // Default cycle length
        
        if (dayOfCycle <= 5) {
          phase = 'menstrual';
        } else if (dayOfCycle > 5 && dayOfCycle < expectedOvulationDay) {
          phase = 'follicular';
        } else if (dayOfCycle >= expectedOvulationDay && dayOfCycle < expectedOvulationDay + 3) {
          phase = 'ovulation';
        } else if (dayOfCycle >= expectedOvulationDay + 3 && dayOfCycle <= expectedOvulationDay + 16) {
          phase = 'luteal';
        } else if (dayOfCycle > expectedOvulationDay + 16 && dayOfCycle >= 20) {
          phase = 'extended-follicular';
        } else if (dayOfCycle > expectedOvulationDay + 16) {
          phase = 'follicular';
        }
      }
    }
    
    return phase;
  }, [cycleData, cycleData?.lastPeriodDate, cycleData?.ovulationDetectedDate, cycleData?.nextMenstrualPhaseEnd]);

  const colors = PHASE_COLORS[currentPhase] || PHASE_COLORS.pending;
  const phaseLabel = PHASE_LABELS[currentPhase] || 'Unknown Phase';
  const phaseDescription = PHASE_DESCRIPTIONS[currentPhase] || '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partnerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
          <span className="text-sage-600 font-medium">Loading your cycle...</span>
        </motion.div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-cream-100 p-5">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mt-16"
        >
          <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-sage-500" />
            </div>
            <h2 className="text-xl font-semibold text-sage-800 mb-2">Welcome</h2>
            <p className="text-sage-600 leading-relaxed">
              No cycle data available yet. Start logging to begin tracking your journey.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-28">
      <motion.div 
        className="max-w-md mx-auto px-5 pt-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header 
          variants={itemVariants}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-semibold text-sage-800">Your Cycle</h1>
            <p className="text-sage-500 text-sm mt-0.5">Track and understand your body</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 bg-white rounded-2xl shadow-soft flex items-center justify-center"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-sage-600" />
          </motion.button>
        </motion.header>

        {/* Main Phase Card */}
        <motion.div
          variants={cardVariants}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCalendar(true)}
          className={`${colors.light} border ${colors.border} rounded-3xl p-6 mb-5 cursor-pointer shadow-soft`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`px-3 py-1.5 rounded-full ${colors.bg} bg-opacity-20`}>
              <span className={`text-xs font-medium ${colors.text}`}>Current Phase</span>
            </div>
            <div className="flex items-center gap-1.5 text-sage-400">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">View Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <h2 className={`text-3xl font-bold ${colors.text} mb-1`}>{phaseLabel}</h2>
          <p className="text-sage-600 text-sm mb-4">{phaseDescription}</p>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white/60 rounded-2xl px-4 py-3">
              <span className="text-xs text-sage-500 block mb-0.5">Day</span>
              <span className={`text-2xl font-bold ${colors.text}`}>{currentDayOfCycle}</span>
              <span className="text-sage-500 text-sm ml-1">of cycle</span>
            </div>
            <div className={`w-14 h-14 ${colors.bg} bg-opacity-20 rounded-2xl flex items-center justify-center`}>
              <Activity className={`w-7 h-7 ${colors.icon}`} />
            </div>
          </div>
        </motion.div>

        {/* Cycle Info Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-5">
          {cycleData.lastPeriodDate && (
            <motion.div 
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowEditPeriod(true)}
              className="bg-white rounded-2xl p-4 shadow-soft cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-phase-menstrual-light rounded-xl flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-phase-menstrual" />
                </div>
              </div>
              <span className="text-xs text-sage-500 block mb-0.5">Last Period</span>
              <span className="font-semibold text-sage-800 text-sm">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </span>
              <span className="text-xs text-sage-400 block mt-1">Tap to edit</span>
            </motion.div>
          )}
          
          {cycleData.nextPeriodDate ? (
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-sage-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sage-500" />
                </div>
              </div>
              <span className="text-xs text-sage-500 block mb-0.5">Next Period</span>
              <span className="font-semibold text-sage-800 text-sm">
                {formatDateForDisplay(cycleData.nextPeriodDate)}
              </span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-sage-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sage-500" />
                </div>
              </div>
              <span className="text-xs text-sage-500 block mb-0.5">Next Period</span>
              <span className="font-semibold text-sage-600 text-sm">Calculating...</span>
            </div>
          )}
        </motion.div>

        {/* Recent Activity Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 shadow-soft mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-sage-500" />
            <h3 className="font-semibold text-sage-800">Recent Activity</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-sage-100">
              <span className="text-sage-600 text-sm">Today's Wellness Score</span>
              <span className={`font-semibold text-sm ${todayScore !== null ? 'text-sage-700' : 'text-sage-400'}`}>
                {todayScore !== null ? `${todayScore}/10` : 'Not logged'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-sage-100">
              <span className="text-sage-600 text-sm">Last Logged</span>
              <span className="font-semibold text-sage-700 text-sm">
                {recentLogs.length > 0 
                  ? formatDateForDisplay(new Date(recentLogs[0].date))
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sage-600 text-sm">Ovulation Detected</span>
              <span className={`font-semibold text-sm ${cycleData.ovulationDetectedDate ? 'text-phase-ovulation' : 'text-sage-400'}`}>
                {cycleData.ovulationDetectedDate ? 'Yes' : 'Not yet'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Partner Code Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 shadow-soft mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-5 h-5 text-sage-500" />
            <h3 className="font-semibold text-sage-800">Partner Connection</h3>
          </div>
          <p className="text-sage-500 text-sm mb-3">Share this code with your partner to connect</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-sage-50 border border-sage-200 rounded-xl py-3 px-4">
              <span className="font-mono text-lg font-bold text-sage-700 tracking-wider">{partnerCode}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyCode}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                copied ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600'
              }`}
            >
              <Copy className="w-5 h-5" />
            </motion.button>
          </div>
          {copied && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sage-500 text-xs mt-2 text-center"
            >
              Copied to clipboard!
            </motion.p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onLogSymptoms}
            className="w-full bg-sage-600 hover:bg-sage-700 text-white font-semibold py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" />
            Log Symptoms
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onLogPeriod}
            className="w-full bg-white hover:bg-sage-50 text-sage-700 font-semibold py-4 rounded-2xl shadow-soft border border-sage-200 flex items-center justify-center gap-2"
          >
            <Droplets className="w-5 h-5" />
            Log Period Start
          </motion.button>
        </motion.div>

        {/* Cycle Calendar Modal */}
        {showCalendar && cycleData && (
          <CycleCalendar
            cycleData={cycleData}
            cycleLengthDays={cycleLengthDays}
            onClose={() => setShowCalendar(false)}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <Settings
            userId={userId}
            onBack={() => setShowSettings(false)}
          />
        )}

        {/* Edit Period Modal */}
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
