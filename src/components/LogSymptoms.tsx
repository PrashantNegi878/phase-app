import React, { useState, useEffect } from 'react';
import { cycleService } from '../services/cycle';
import { TrackerProfile } from '../types';
import { getToday, formatDateForInput, formatDateForDisplay } from '../utils/dateUtils';

interface LogSymptomsProps {
  userId: string;
  onLogComplete: () => void;
  onCancel: () => void;
}

export function LogSymptoms({ userId, onLogComplete, onCancel }: LogSymptomsProps) {
  const [date, setDate] = useState(formatDateForInput(getToday()));
  const [symptoms, setSymptoms] = useState<any>({});
  const [trackerProfile, setTrackerProfile] = useState<TrackerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await cycleService.getTrackerProfile(userId);
        setTrackerProfile(profile);
      } catch (err) {
        setError('Failed to load tracker profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleSaveSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      console.log('Saving symptoms:', { userId, date, symptoms });
      await cycleService.logDailySymptoms(userId, new Date(date), symptoms);
      console.log('Symptoms saved successfully');
      onLogComplete();
    } catch (err) {
      console.error('Error saving symptoms:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save symptoms';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-4 sm:rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">Log Symptoms</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSaveSymptoms} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
              <div className="text-sm text-gray-600">
                Selected date: {formatDateForDisplay(new Date(date))}
              </div>
            </div>
          </div>

          {/* Cervical Fluid */}
          {trackerProfile?.trackedSymptoms?.includes('cervical-fluid') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cervical Fluid
              </label>
              <select
                value={symptoms.cervicalFluid || ''}
                onChange={(e) =>
                  setSymptoms({ ...symptoms, cervicalFluid: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Not tracked today</option>
                <option value="none">None</option>
                <option value="sticky">Sticky</option>
                <option value="creamy">Creamy</option>
                <option value="egg-white">Egg-White (Clear & Stretchy)</option>
              </select>
            </div>
          )}

          {/* Basal Body Temperature */}
          {trackerProfile?.trackedSymptoms?.includes('bbt') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Basal Body Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="39"
                value={symptoms.bbt || ''}
                onChange={(e) =>
                  setSymptoms({ ...symptoms, bbt: parseFloat(e.target.value) || '' })
                }
                placeholder="36.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}

          {/* Cramps */}
          {trackerProfile?.trackedSymptoms?.includes('cramps') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cramps
              </label>
              <select
                value={symptoms.cramps || ''}
                onChange={(e) =>
                  setSymptoms({ ...symptoms, cramps: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Not tracked today</option>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          )}

          {/* Mood */}
          {trackerProfile?.trackedSymptoms?.includes('mood') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood
              </label>
              <select
                value={symptoms.mood || ''}
                onChange={(e) =>
                  setSymptoms({ ...symptoms, mood: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Not tracked today</option>
                <option value="happy">Happy</option>
                <option value="neutral">Neutral</option>
                <option value="sad">Sad</option>
                <option value="anxious">Anxious</option>
                <option value="irritable">Irritable</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={symptoms.notes || ''}
              onChange={(e) =>
                setSymptoms({ ...symptoms, notes: e.target.value })
              }
              placeholder="Any other observations..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Symptoms'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
