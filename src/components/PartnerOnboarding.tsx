import { authService } from '../services/auth';
import { cycleService } from '../services/cycle';
import { useState } from 'react';
interface PartnerOnboardingProps {
  userId: string;
  onComplete: () => void;
}

export function PartnerOnboarding({ userId, onComplete }: PartnerOnboardingProps) {
  const [step, setStep] = useState<'link-choice' | 'link-input' | 'manual-setup'>('link-choice');
  const [partnerCode, setPartnerCode] = useState('');
  const [supportStyle, setSupportStyle] = useState('acts-of-service');
  const [scheduleConstraints, setScheduleConstraints] = useState('flexible');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkAccount = async () => {
    if (!partnerCode || partnerCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.linkPartnerToTracker(userId, partnerCode);
      await cycleService.updatePartnerProfile(userId, supportStyle, scheduleConstraints);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setLoading(false);
    }
  };

  const handleManualMode = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Saving partner profile:', { userId, supportStyle, scheduleConstraints });
      await cycleService.updatePartnerProfile(userId, supportStyle, scheduleConstraints);
      console.log('Partner profile saved, completing onboarding');
      onComplete();
    } catch (err) {
      console.error('Error in handleManualMode:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Partner Setup
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {step === 'link-choice' && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">
              How would you like to connect?
            </p>

            <button
              onClick={() => setStep('link-input')}
              className="w-full p-4 border-2 border-pink-200 rounded-lg hover:bg-pink-50 transition text-left"
            >
              <div className="font-semibold text-gray-800">Link Account</div>
              <div className="text-sm text-gray-600">Enter your partner's 6-digit code</div>
            </button>

            <button
              onClick={() => setStep('manual-setup')}
              className="w-full p-4 border-2 border-pink-200 rounded-lg hover:bg-pink-50 transition text-left"
            >
              <div className="font-semibold text-gray-800">Manual Mode</div>
              <div className="text-sm text-gray-600">I'll track data myself</div>
            </button>
          </div>
        )}

        {step === 'link-input' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('link-choice')}
              className="text-pink-600 hover:text-pink-700 text-sm font-semibold mb-4"
            >
              ← Back
            </button>

            <p className="text-gray-600 mb-4">
              Enter your partner's 6-digit code:
            </p>

            <input
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-center text-2xl tracking-widest"
            />

            <div className="space-y-3 mt-6">
              <label className="block text-sm font-medium text-gray-700">
                Your Support Style:
              </label>
              <select
                value={supportStyle}
                onChange={(e) => setSupportStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="acts-of-service">Acts of Service</option>
                <option value="gifts">Gifts</option>
                <option value="emotional-support">Emotional Support</option>
                <option value="quality-time">Quality Time</option>
                <option value="physical-touch">Physical Touch</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Daily Schedule:
              </label>
              <select
                value={scheduleConstraints}
                onChange={(e) => setScheduleConstraints(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="busy-student">Busy Student</option>
                <option value="flexible">Flexible</option>
                <option value="strict-gym-routine">Strict Gym Routine</option>
                <option value="business-professional">Business Professional</option>
              </select>
            </div>

            <button
              onClick={handleLinkAccount}
              disabled={loading || partnerCode.length !== 6}
              className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Linking...' : 'Link Account'}
            </button>
          </div>
        )}

        {step === 'manual-setup' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('link-choice')}
              className="text-pink-600 hover:text-pink-700 text-sm font-semibold mb-4"
            >
              ← Back
            </button>

            <p className="text-gray-600 mb-6">
              Set up your preferences for manual tracking:
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Your Support Style:
              </label>
              <select
                value={supportStyle}
                onChange={(e) => setSupportStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="acts-of-service">Acts of Service</option>
                <option value="gifts">Gifts</option>
                <option value="emotional-support">Emotional Support</option>
                <option value="quality-time">Quality Time</option>
                <option value="physical-touch">Physical Touch</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Daily Schedule:
              </label>
              <select
                value={scheduleConstraints}
                onChange={(e) => setScheduleConstraints(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="busy-student">Busy Student</option>
                <option value="flexible">Flexible</option>
                <option value="strict-gym-routine">Strict Gym Routine</option>
                <option value="business-professional">Business Professional</option>
              </select>
            </div>

            <button
              onClick={handleManualMode}
              disabled={loading}
              className="w-full mt-6 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Continue to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
