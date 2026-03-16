import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData, TrackerProfile } from '../types';
import { CycleCalendar } from './CycleCalendar';
import { Settings } from './Settings';
import { EditPeriod } from './EditPeriod';
import { DailyLog } from '../types';
import { getToday, normalizeDate, calculateDayOfCycle, calculateDayOfCycleForDate, formatDateForDisplay } from '../utils/dateUtils';

interface TrackerDashboardProps {
  userId: string;
  partnerCode: string;
  onLogSymptoms: () => void;
  onLogPeriod: () => void;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto mt-12 bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">No cycle data available. Please start logging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Your Phase</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-800 text-xl"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Current Phase Card */}
        <div
          onClick={() => setShowCalendar(true)}
          className={`${colors.light} border-2 ${colors.text.replace('text-', 'border-')} rounded-lg p-6 mb-6 text-center cursor-pointer hover:shadow-lg transition`}
        >
          <div className="text-sm font-semibold text-gray-600 mb-2">Current Phase</div>
          <div className={`text-3xl font-bold ${colors.text} mb-2`}>{phaseLabel}</div>
          <div className="text-gray-600">Day {currentDayOfCycle} of your cycle</div>
          <div className="text-xs text-gray-500 mt-3">Click to view cycle calendar 📅</div>
        </div>

        {/* Cycle Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {cycleData.lastPeriodDate && (
            <div 
              onClick={() => setShowEditPeriod(true)}
              className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition"
            >
              <div className="text-xs text-gray-500 mb-1">Last Period Started</div>
              <div className="font-semibold text-gray-800">
                {formatDateForDisplay(cycleData.lastPeriodDate)}
              </div>
              <div className="text-xs text-gray-400 mt-1">click to edit</div>
            </div>
          )}
          {cycleData.periodEndDate && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Period Ended</div>
              <div className="font-semibold text-gray-800">
                {formatDateForDisplay(cycleData.periodEndDate)}
              </div>
            </div>
          )}
          {cycleData.nextPeriodDate ? (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Next Period</div>
              <div className="font-semibold text-gray-800">
                {formatDateForDisplay(cycleData.nextPeriodDate)}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Next Period</div>
              <div className="font-semibold text-gray-800">Pending</div>
            </div>
          )}
        </div>

        {/* Partner Code Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Partner Code</div>
          <div className="bg-pink-50 border border-pink-200 rounded p-3 text-center font-mono text-lg font-bold text-pink-600">
            {partnerCode}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Share this with your partner to connect
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onLogSymptoms}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-lg transition shadow-sm"
          >
            📝 Log Symptoms
          </button>
          <button
            onClick={onLogPeriod}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition shadow-sm"
          >
            🩸 Log Period Start
          </button>
        </div>

        {/* Recent Symptoms Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Symptoms</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Today's Score:</span>
              <span className="font-medium">
                {todayScore !== null ? `${todayScore}/10` : 'Not logged today'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Logged:</span>
              <span className="font-medium">
                {recentLogs.length > 0 
                  ? formatDateForDisplay(new Date(recentLogs[0].date))
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ovulation Detected:</span>
              <span className="font-medium">{cycleData.ovulationDetectedDate ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

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
