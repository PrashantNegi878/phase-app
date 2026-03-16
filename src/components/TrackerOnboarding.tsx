import React, { useState } from 'react';
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

  const symptomOptions = [
    { id: 'cervical-fluid', label: 'Cervical Fluid', description: 'Track consistency' },
    { id: 'bbt', label: 'Basal Body Temperature', description: 'Track temperature' },
    { id: 'cramps', label: 'Cramps', description: 'Track pain levels' },
    { id: 'mood', label: 'Mood', description: 'Track mood changes' },
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
        console.log('Updating tracker symptoms:', selectedSymptoms);
        await cycleService.updateTrackerSymptoms(userId, selectedSymptoms);
        console.log('Recording period start:', lastPeriodDate);
        await cycleService.recordPeriodStart(userId, parseDateFromInput(lastPeriodDate));
        console.log('Onboarding completed successfully');
        onComplete();
      } catch (err) {
        console.error('Onboarding error:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        {step === 'welcome' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Phase!</h1>
              <p className="text-gray-600">
                Let's get you started with tracking your cycle. Your partner code is:
              </p>
            </div>

            <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Your Partner Code</p>
              <p className="text-4xl font-bold text-pink-600 tracking-widest">
                {partnerCode}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Share this code with your partner to link accounts
              </p>
            </div>

            <button
              onClick={() => setStep('symptoms')}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'symptoms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                What would you like to track?
              </h2>
              <p className="text-sm text-gray-600">
                Select the symptoms or metrics you want to monitor
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {symptomOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                    selectedSymptoms.includes(option.id)
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.includes(option.id)}
                    onChange={() => toggleSymptom(option.id)}
                    className="mt-1 mr-3 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-gray-800">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition"
            >
              Next
            </button>
          </div>
        )}

        {step === 'period-date' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                When was your last period?
              </h2>
              <p className="text-sm text-gray-600">
                This helps us predict your cycle phases accurately
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <input
                type="date"
                value={lastPeriodDate}
                onChange={(e) => setLastPeriodDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
              {lastPeriodDate && (
                <div className="text-sm text-gray-600">
                  Selected date: {formatDateForDisplay(new Date(lastPeriodDate))}
                </div>
              )}
            </div>

            <button
              onClick={handleContinue}
              disabled={loading || !lastPeriodDate}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Start Tracking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
