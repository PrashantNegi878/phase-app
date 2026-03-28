import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Activity, FileText, Check, Droplets, Thermometer, Flame, Heart, Minus, GripHorizontal, Cloud, Smile, Zap, AlertTriangle, SmilePlus, Meh, Frown, Wind, CloudLightning, Info, CalendarCheck } from 'lucide-react';
import { cycleService } from '../services/cycle';
import { getToday, formatDateForInput, formatDateForDisplay, parseDateFromInput } from '../utils/dateUtils';

interface LogSymptomsProps {
  userId: string;
  onLogComplete: () => void;
  onCancel: () => void;
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  color?: string;
}

function OptionCard({ selected, onClick, icon, label, color = 'sage' }: OptionCardProps) {
  const colorClasses = {
    sage: {
      selected: 'border-sage-400 bg-sage-50 ring-2 ring-sage-200',
      icon: 'bg-sage-100 text-sage-600',
      check: 'bg-sage-500',
    },
    amber: {
      selected: 'border-amber-400 bg-amber-50 ring-2 ring-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      check: 'bg-amber-500',
    },
    rose: {
      selected: 'border-rose-400 bg-rose-50 ring-2 ring-rose-200',
      icon: 'bg-rose-100 text-rose-600',
      check: 'bg-rose-500',
    },
    sky: {
      selected: 'border-sky-400 bg-sky-50 ring-2 ring-sky-200',
      icon: 'bg-sky-100 text-sky-600',
      check: 'bg-sky-500',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.sage;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`relative p-3 rounded-xl border-2 transition-colors duration-200 text-left ${
        selected
          ? colors.selected
          : 'border-earth-200 bg-white hover:border-earth-300 hover:bg-earth-50'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            selected ? colors.icon : 'bg-earth-100 text-earth-500'
          }`}>
            {icon}
          </div>
        )}
        <span className={`text-sm font-medium ${selected ? 'text-slate-800' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -top-1.5 -right-1.5 w-5 h-5 ${colors.check} rounded-full flex items-center justify-center shadow-sm`}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}

// Cervical Fluid Options
const cervicalFluidOptions = [
  { value: '', label: 'Not tracked', icon: <X className="w-4 h-4" /> },
  { value: 'none', label: 'None / Dry', icon: <Minus className="w-4 h-4" /> },
  { value: 'sticky', label: 'Sticky', icon: <GripHorizontal className="w-4 h-4" /> },
  { value: 'creamy', label: 'Creamy', icon: <Cloud className="w-4 h-4" /> },
  { value: 'egg-white', label: 'Egg-White', icon: <Droplets className="w-4 h-4" /> },
];

// Cramps Options
const crampsOptions = [
  { value: '', label: 'Not tracked', icon: <X className="w-4 h-4" /> },
  { value: 'none', label: 'None', icon: <Smile className="w-4 h-4" /> },
  { value: 'mild', label: 'Mild', icon: <Zap className="w-4 h-4" /> },
  { value: 'moderate', label: 'Moderate', icon: <Flame className="w-4 h-4" /> },
  { value: 'severe', label: 'Severe', icon: <AlertTriangle className="w-4 h-4" /> },
];

// Mood Options
const moodOptions = [
  { value: '', label: 'Not tracked', icon: <X className="w-4 h-4" /> },
  { value: 'happy', label: 'Happy', icon: <SmilePlus className="w-4 h-4" /> },
  { value: 'neutral', label: 'Neutral', icon: <Meh className="w-4 h-4" /> },
  { value: 'sad', label: 'Sad', icon: <Frown className="w-4 h-4" /> },
  { value: 'anxious', label: 'Anxious', icon: <Wind className="w-4 h-4" /> },
  { value: 'irritable', label: 'Irritable', icon: <CloudLightning className="w-4 h-4" /> },
];

export function LogSymptoms({ userId, onLogComplete, onCancel }: LogSymptomsProps) {
  const [date, setDate] = useState(formatDateForInput(getToday()));
  const [symptoms, setSymptoms] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [additionalMessage, setAdditionalMessage] = useState<string | null>(null);
  const [newCycleLength, setNewCycleLength] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSaveSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const parsedDate = parseDateFromInput(date);
    if (parsedDate > getToday()) {
      setError('Cannot log symptoms for a future date');
      setSaving(false);
      return;
    }

    try {
      const result = await cycleService.logDailySymptoms(userId, parsedDate, symptoms);
      setAdditionalMessage(result.additionalMessage || null);
      if (result.newCycleLength) {
        setNewCycleLength(result.newCycleLength);
      }
      setIsSuccess(true);
      
      // Auto-close after a delay
      const delay = (result.additionalMessage || result.newCycleLength) ? 4500 : 1500;
      setTimeout(() => {
        onLogComplete();
      }, delay);
    } catch (err) {
      console.error('Error saving symptoms:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save symptoms';
      setError(errorMessage);
      setSaving(false);
    }
  };

  const buttonTap = { scale: 0.97 };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden shadow-soft-lg flex flex-col"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-full overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-earth-100 flex items-center justify-between p-5 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-sage-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">Log Symptoms</h2>
                </div>
                <motion.button
                  onClick={onCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={buttonTap}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-earth-100 text-earth-400 hover:text-earth-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <form onSubmit={handleSaveSymptoms} className="p-6 space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Calendar className="w-4 h-4 text-sage-500" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    max={formatDateForInput(getToday())}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors bg-white text-slate-700"
                  />
                  <p className="mt-2 text-sm text-earth-500">
                    {(() => {
                      if (!date) return '';
                      try {
                        const parts = date.split('-');
                        if (parts.length !== 3) return '';
                        const [year, month, day] = parts.map(Number);
                        return formatDateForDisplay(new Date(year, month - 1, day));
                      } catch {
                        return '';
                      }
                    })()}
                  </p>
                </div>

                {/* Cervical Fluid */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    Cervical Fluid
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {cervicalFluidOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={symptoms.cervicalFluid === option.value || (!symptoms.cervicalFluid && option.value === '')}
                        onClick={() => setSymptoms({ ...symptoms, cervicalFluid: option.value })}
                        icon={option.icon}
                        label={option.label}
                        color="sky"
                      />
                    ))}
                  </div>
                </div>

                {/* Basal Body Temperature */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Thermometer className="w-4 h-4 text-amber-500" />
                    Basal Body Temperature
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="35"
                      max="39"
                      value={symptoms.bbt || ''}
                      onChange={(e) => setSymptoms({ ...symptoms, bbt: parseFloat(e.target.value) || '' })}
                      placeholder="36.5"
                      className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-colors bg-white text-slate-700 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-earth-400 font-medium">°C</span>
                  </div>
                </div>

                {/* Cramps */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Flame className="w-4 h-4 text-rose-500" />
                    Cramps
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {crampsOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={symptoms.cramps === option.value || (!symptoms.cramps && option.value === '')}
                        onClick={() => setSymptoms({ ...symptoms, cramps: option.value })}
                        icon={option.icon}
                        label={option.label}
                        color="rose"
                      />
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Heart className="w-4 h-4 text-sage-500" />
                    Mood
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {moodOptions.map((option) => (
                      <OptionCard
                        key={option.value}
                        selected={symptoms.mood === option.value || (!symptoms.mood && option.value === '')}
                        onClick={() => setSymptoms({ ...symptoms, mood: option.value })}
                        icon={option.icon}
                        label={option.label}
                        color="sage"
                      />
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <FileText className="w-4 h-4 text-sage-500" />
                    Notes (optional)
                  </label>
                  <textarea
                    value={symptoms.notes || ''}
                    onChange={(e) => setSymptoms({ ...symptoms, notes: e.target.value })}
                    placeholder="Any other observations..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-earth-200 rounded-xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors bg-white text-slate-700 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={onCancel}
                    whileHover={{ y: -2 }}
                    whileTap={buttonTap}
                    className="flex-1 px-4 py-3.5 border-2 border-earth-200 text-slate-700 font-medium rounded-xl hover:border-earth-300 hover:bg-earth-50 transition-colors duration-200"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileHover={{ y: -2 }}
                    whileTap={buttonTap}
                    className="flex-1 px-4 py-3.5 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium rounded-xl transition-colors duration-200 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Symptoms'
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="p-10 flex flex-col items-center justify-center text-center min-h-[400px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 mb-8 shadow-soft-lg"
              >
                <Check className="w-10 h-10" strokeWidth={3} />
              </motion.div>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-slate-800 mb-3"
              >
                Log Successful!
              </motion.h3>

              <AnimatePresence>
                {newCycleLength && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6 p-4 bg-white border border-sage-100 rounded-[28px] shadow-soft-lg flex flex-col items-center gap-3 w-full max-w-[280px]"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-sage-50 flex items-center justify-center text-sage-600">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-sage-500 uppercase tracking-[0.1em] font-black mb-1">
                        Smart Sync Active
                      </p>
                      <h4 className="text-base font-bold text-slate-800 leading-tight">
                        Recalculated Cycle: <br/> {newCycleLength} Days
                      </h4>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {additionalMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="max-w-xs mx-auto"
                  >
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Info className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-sm font-medium text-amber-800 leading-relaxed italic">
                        {additionalMessage}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="mt-8 text-xs text-earth-500 uppercase tracking-widest font-semibold"
              >
                Closing automatically...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}