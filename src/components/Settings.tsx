import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TrackerProfile } from '../types';
import { getToday } from '../utils/dateUtils';

interface SettingsProps {
  userId: string;
  onBack: () => void;
}

export function Settings({ userId, onBack }: SettingsProps) {
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch current tracker profile
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'trackerProfiles', userId));
        if (docSnap.exists()) {
          const profile = docSnap.data() as TrackerProfile;
          setCycleLengthDays(profile.cycleLengthDays || 28);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateDoc(doc(db, 'trackerProfiles', userId), {
        cycleLengthDays,
        updatedAt: getToday(),
      });
      setMessage('Cycle length updated successfully! ✓');
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update cycle length');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="border-b flex items-center justify-between p-6">
          <h2 className="text-2xl font-bold text-gray-800">Phase Settings</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cycle Length Setting */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Typical Cycle Length (days)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="21"
                max="40"
                value={cycleLengthDays}
                onChange={(e) => setCycleLengthDays(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {cycleLengthDays}
                </div>
                <div className="text-xs text-gray-500">days</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>Set your typical cycle length to get accurate ovulation predictions.</p>
              <p className="mt-1 text-xs text-gray-500">
                Expected ovulation: Day {Math.round(cycleLengthDays / 2)}
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>💡 How this works:</strong> The calendar will show expected phases based on your cycle length. Once you log enough symptoms, we'll track your actual ovulation day.
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-sm p-3 rounded-lg ${
                message.includes('Failed')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
