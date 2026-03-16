import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CycleData, TrackerProfile } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import axios from 'axios';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Droplets, 
  Heart, 
  Activity,
  ChevronRight,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Users,
  AlertCircle
} from 'lucide-react';

interface PartnerDashboardProps {
  userId: string;
  linkedTrackerId?: string;
  isManualMode: boolean;
  onLogSymptoms?: () => void;
  onLogPeriod?: () => void;
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
  menstrual: 'A time for rest and comfort',
  follicular: 'Energy levels are rising',
  ovulation: 'Peak energy and connection',
  luteal: 'Winding down, be supportive',
  'extended-follicular': 'Extended growth phase',
  pending: 'Waiting for cycle data',
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

const suggestionVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.3 }
  })
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

    // Only set up listener if we have the necessary data
    if ((isManualMode && userId) || (!isManualMode && linkedTrackerId)) {
      try {
        const docRef = isManualMode 
          ? doc(db, 'cycleData', userId) 
          : doc(db, 'cycleData', linkedTrackerId!); // linkedTrackerId is guaranteed to exist due to the condition
        
        console.log(`Setting up listener for ${isManualMode ? 'manual' : 'linked'} mode, doc:`, docRef.path);
        
        // Real-time listener
        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as CycleData;
              console.log(`Got cycle data for ${isManualMode ? 'manual' : 'linked'} mode:`, data);
              setCycleData(data);
            } else {
              console.log(`No cycle data found for ${isManualMode ? 'manual' : 'linked'} mode`);
              setCycleData(null);
            }
            setLoadingCycle(false);
          },
          (error) => {
            console.error(`Error listening to cycle data (${isManualMode ? 'manual' : 'linked'}):`, error);
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
      // If we don't have the necessary data to set up the listener, set loading to false
      setLoadingCycle(false);
    }

    return () => {
      if (unsubscribe) {
        console.log('Unsubscribing from cycle data listener');
        unsubscribe();
      }
    };
  }, [userId, linkedTrackerId, isManualMode]);

  // Fetch tracker profile for cycle length
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

  if (loadingCycle) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 border-3 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
          <span className="text-sage-600 font-medium">Loading cycle data...</span>
        </motion.div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-cream-100 p-5">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md mx-auto mt-12"
        >
          <motion.div 
            variants={cardVariants}
            className="bg-white rounded-3xl shadow-soft p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-sage-500" />
              </div>
              <h2 className="text-xl font-semibold text-sage-800 mb-2">Get Started</h2>
              <p className="text-sage-600 leading-relaxed">
                {isManualMode
                  ? 'To start tracking, first log when your last period started.'
                  : "Your partner hasn't shared their cycle data yet."}
              </p>
            </div>
            
            {isManualMode && onLogPeriod && (
              <motion.div variants={itemVariants}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onLogPeriod}
                  className="w-full bg-sage-600 hover:bg-sage-700 text-white font-semibold py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2 mb-3"
                >
                  <Droplets className="w-5 h-5" />
                  Log Period Start
                </motion.button>
                <p className="text-xs text-sage-500 text-center">
                  Once you log your period, you can track symptoms
                </p>
              </motion.div>
            )}
            
            {!isManualMode && (
              <motion.div 
                variants={itemVariants}
                className="bg-sage-50 rounded-2xl p-4 flex items-start gap-3"
              >
                <Users className="w-5 h-5 text-sage-500 mt-0.5" />
                <p className="text-sm text-sage-600">
                  Please ask your partner to log their cycle data first, then you'll be able to see their phase information here.
                </p>
              </motion.div>
            )}
          </motion.div>
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
            <h1 className="text-2xl font-semibold text-sage-800">
              {isManualMode ? 'Your Cycle' : "Partner's Cycle"}
            </h1>
            <p className="text-sage-500 text-sm mt-0.5 flex items-center gap-1.5">
              {isManualMode ? (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  Manual tracking mode
                </>
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5" />
                  Connected with partner
                </>
              )}
            </p>
          </div>
          {isManualMode && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(true)}
              className="w-11 h-11 bg-white rounded-2xl shadow-soft flex items-center justify-center"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5 text-sage-600" />
            </motion.button>
          )}
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
              <span className={`text-2xl font-bold ${colors.text}`}>
                {isManualMode ? cycleData.dayOfCycle : calculateDayOfCycle(normalizeDate(cycleData.lastPeriodDate))}
              </span>
              <span className="text-sage-500 text-sm ml-1">of cycle</span>
            </div>
            <div className={`w-14 h-14 ${colors.bg} bg-opacity-20 rounded-2xl flex items-center justify-center`}>
              <Activity className={`w-7 h-7 ${colors.icon}`} />
            </div>
          </div>
        </motion.div>

        {/* Cycle Info Card */}
        {cycleData.lastPeriodDate && (
          <motion.div 
            variants={itemVariants}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowEditPeriod(true)}
            className="bg-white rounded-2xl p-4 shadow-soft mb-5 cursor-pointer flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-phase-menstrual-light rounded-2xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-phase-menstrual" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-sage-500 block mb-0.5">Last Period Started</span>
              <span className="font-semibold text-sage-800">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-sage-300" />
          </motion.div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Suggestions Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-5 shadow-soft mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-phase-ovulation-light rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-phase-ovulation" />
            </div>
            <div>
              <h3 className="font-semibold text-sage-800">Daily Insights</h3>
              <p className="text-xs text-sage-500">Personalized suggestions for today</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {suggestions.length > 0 ? (
              <motion.div 
                key="suggestions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2 mb-4"
              >
                {suggestions.map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    custom={idx}
                    variants={suggestionVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-sage-50 border border-sage-100 rounded-xl p-3"
                  >
                    <p className="text-sage-700 text-sm leading-relaxed">{suggestion}</p>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.p 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sage-500 text-sm mb-4 leading-relaxed"
              >
                Get personalized suggestions based on the current cycle phase to better understand and support.
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="w-full bg-sage-100 hover:bg-sage-200 text-sage-700 font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingSuggestions ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Getting insights...
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
          <motion.div variants={itemVariants}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onLogSymptoms}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white font-semibold py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2"
            >
              <Activity className="w-5 h-5" />
              Log Symptoms
            </motion.button>
          </motion.div>
        )}

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
