import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { cycleService } from '../services/cycle';
import { CycleData } from '../types';
import { normalizeDate, formatDateForInput, parseDateFromInput, formatDateForDisplay } from '../utils/dateUtils';

interface EditPeriodProps {
  userId: string;
  onEditComplete: () => void;
  onCancel: () => void;
}

export function EditPeriod({ userId, onEditComplete, onCancel }: EditPeriodProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch current cycle data
    const fetchCycleData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'cycleData', userId));
        if (docSnap.exists()) {
          const data = docSnap.data() as CycleData;
          setCycleData(data);

          // Convert dates to string format for input
          if (data.lastPeriodDate) {
            const start = normalizeDate(data.lastPeriodDate);
            setStartDate(formatDateForInput(start));
          }

          if (data.periodEndDate) {
            const end = normalizeDate(data.periodEndDate);
            setEndDate(formatDateForInput(end));
          }
        }
      } catch (err) {
        console.error('Error fetching cycle data:', err);
        setError('Failed to load period data');
      } finally {
        setLoading(false);
      }
    };

    fetchCycleData();
  }, [userId]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validate that end date is not before start date
    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('Period end date must be after start date');
      setSaving(false);
      return;
    }

    try {
      console.log('Updating period:', { userId, startDate, endDate });

      // Use recordPeriodStart for editing existing periods
      await cycleService.recordPeriodStart(userId, parseDateFromInput(startDate), endDate ? parseDateFromInput(endDate) : undefined);

      console.log('Period updated successfully');
      onEditComplete();
    } catch (err) {
      console.error('Error updating period:', err);
      setError(err instanceof Error ? err.message : 'Failed to update period');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
        <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md p-6">
          <p className="text-gray-600">Loading period data...</p>
        </div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
        <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md">
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-4">No period data to edit yet.</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md">
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-4 sm:rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">Edit Phase Log</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSaveChanges} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period Start Date
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Auto-update end date to start date + 4 days
                    const startDateObj = new Date(e.target.value);
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(startDateObj.getDate() + 4);
                    setEndDate(formatDateForInput(endDateObj));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                required
              />
              <div className="text-sm text-gray-600">
                Selected date: {formatDateForDisplay(new Date(startDate))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period End Date (Optional)
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
              {endDate && (
                <div className="text-sm text-gray-600">
                  Selected date: {formatDateForDisplay(new Date(endDate))}
                </div>
              )}
              {startDate && endDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Period duration: ~{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p>Updating the period will recalculate your cycle phases and ovulation prediction.</p>
          </div>

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
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
