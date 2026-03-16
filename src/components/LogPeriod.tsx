import React, { useState } from 'react';
import { cycleService } from '../services/cycle';
import { getToday, formatDateForInput, addDays, parseDateFromInput, formatDateForDisplay } from '../utils/dateUtils';

interface LogPeriodProps {
  userId: string;
  onLogComplete: () => void;
  onCancel: () => void;
}

export function LogPeriod({ userId, onLogComplete, onCancel }: LogPeriodProps) {
  const today = getToday();
  const defaultEndDate = addDays(today, 4); // 5 days total (today + 4 days)
  
  const [startDate, setStartDate] = useState(formatDateForInput(today));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEndDate));
  const [hasManuallyChangedEndDate, setHasManuallyChangedEndDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validate that end date is not before start date
    if (new Date(endDate) < new Date(startDate)) {
      setError('Period end date must be after start date');
      setSaving(false);
      return;
    }

    try {
      console.log('Logging period:', { userId, startDate, endDate });
      await cycleService.recordPeriodStart(userId, parseDateFromInput(startDate), parseDateFromInput(endDate));
      console.log('Period logged successfully');
      onLogComplete();
    } catch (err) {
      console.error('Error logging period:', err);
      setError(err instanceof Error ? err.message : 'Failed to save period');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md">
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-4 sm:rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">Log Phase Start</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSavePeriod} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When did your period start?
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Auto-update end date to start date + 4 days if user hasn't manually changed it
                  if (!hasManuallyChangedEndDate) {
                    const startDateObj = new Date(e.target.value);
                    const endDateObj = new Date(startDateObj);
                    endDateObj.setDate(startDateObj.getDate() + 4);
                    setEndDate(formatDateForInput(endDateObj));
                  }
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
              When did your period end?
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  // Mark that user has manually changed the end date
                  setHasManuallyChangedEndDate(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                required
              />
              <div className="text-sm text-gray-600">
                Selected date: {formatDateForDisplay(new Date(endDate))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Period duration: ~{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
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
              className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Log Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
