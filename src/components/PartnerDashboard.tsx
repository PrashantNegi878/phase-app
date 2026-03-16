import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
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

const PHASE_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  menstrual: { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50' },
  follicular: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
  ovulation: { bg: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50' },
  luteal: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
  'extended-follicular': {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    light: 'bg-blue-50',
  },
  pending: { bg: 'bg-gray-600', text: 'text-gray-600', light: 'bg-gray-50' },
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

  if (loadingCycle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 p-4">
        <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Get Started</h2>
          <p className="text-gray-600 mb-6 text-center">
            {isManualMode
              ? 'To start tracking, first log when your last period started.'
              : "Your partner hasn't shared their cycle data yet."}
          </p>
          {isManualMode && onLogPeriod && (
            <>
              <button
                onClick={onLogPeriod}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-lg mb-3 transition"
              >
                🩸 Log Period Start (Required First)
              </button>
              <p className="text-xs text-gray-500 text-center mb-3">
                Once you log your period, you can track symptoms
              </p>
            </>
          )}
          {!isManualMode && (
            <p className="text-xs text-gray-500 text-center">
              Please ask your partner to log their cycle data first.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isManualMode ? 'Your Phase' : "Partner's Phase"}
            </h1>
            <p className="text-sm text-gray-600">
              {isManualMode ? 'Manual tracking mode' : 'Linked to partner'}
            </p>
          </div>
          {isManualMode && (
            <button
              onClick={() => setShowSettings(true)}
              className="text-gray-600 hover:text-gray-800 text-xl"
              title="Settings"
            >
              ⚙️
            </button>
          )}
        </div>

        {/* Current Phase Card */}
        <div
          onClick={() => setShowCalendar(true)}
          className={`${colors.light} border-2 ${colors.text.replace('text-', 'border-')} rounded-lg p-6 mb-6 text-center cursor-pointer hover:shadow-lg transition`}
        >
          <div className="text-sm font-semibold text-gray-600 mb-2">Current Phase</div>
          <div className={`text-3xl font-bold ${colors.text} mb-2`}>{phaseLabel}</div>
          <div className="text-gray-600">
            Day {isManualMode ? cycleData.dayOfCycle : calculateDayOfCycle(normalizeDate(cycleData.lastPeriodDate))} of the cycle
          </div>
          <div className="text-xs text-gray-500 mt-3">Click to view cycle calendar 📅</div>
        </div>

        {/* Cycle Info */}
        {cycleData.lastPeriodDate && (
          <div 
            onClick={() => setShowEditPeriod(true)}
            className="bg-white rounded-lg p-4 shadow-sm mb-6 cursor-pointer hover:shadow-md transition"
          >
            <div className="text-sm text-gray-500 mb-2">Last Period</div>
            <div className="font-semibold text-gray-800">
              {formatDateForDisplay(cycleData.lastPeriodDate)}
            </div>
            <div className="text-xs text-gray-400 mt-1">click to edit</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* AI Suggestions Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">💡 Daily Suggestion</h2>

          {suggestions.length > 0 ? (
            <div className="space-y-3 mb-4">
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="bg-pink-50 border border-pink-200 rounded p-3"
                >
                  <p className="text-gray-700 text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm mb-4">
              Get personalized suggestions based on the current cycle phase.
            </p>
          )}

          <button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loadingSuggestions ? 'Getting suggestions...' : 'Get Suggestions'}
          </button>
        </div>

        {/* Manual Mode: Log Symptoms */}
        {isManualMode && onLogSymptoms && (
          <button
            onClick={onLogSymptoms}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
          >
            📝 Log Symptoms
          </button>
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
      </div>
    </div>
  );
}
