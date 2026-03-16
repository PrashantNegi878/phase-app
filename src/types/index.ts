/* Global App Types */

export interface User {
  uid: string;
  email: string;
  role: 'tracker' | 'partner';
  partnerCode?: string;
  linkedTrackerId?: string;
  createdAt: Date;
}

export interface TrackerProfile {
  userId: string;
  partnerCode: string;
  trackedSymptoms: SymptomType[];
  lastPeriodDate: Date | null;
  nextPeriodDate: Date | null;
  cycleLengthDays: number; // Default 28, user can set 21-40
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerProfile {
  userId: string;
  linkedTrackerId?: string;
  supportStyle?: 'acts-of-service' | 'gifts' | 'emotional-support' | 'quality-time' | 'physical-touch';
  dailyScheduleConstraints?: 'busy-student' | 'flexible' | 'strict-gym-routine' | 'business-professional';
  createdAt: Date;
  updatedAt: Date;
}

export type SymptomType = 'cervical-fluid' | 'bbt' | 'cramps' | 'mood';

export interface DailyLog {
  userId: string;
  date: Date;
  symptoms: {
    cervicalFluid?: 'none' | 'sticky' | 'creamy' | 'egg-white';
    bbt?: number; // in Celsius
    cramps?: 'none' | 'mild' | 'moderate' | 'severe';
    mood?: 'happy' | 'neutral' | 'sad' | 'anxious' | 'irritable';
  };
  notes?: string;
  symptomScore: number;
}

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'extended-follicular' | 'pending';

export interface CycleData {
  userId: string;
  lastPeriodDate: Date | null;
  periodEndDate?: Date | null;
  ovulationDetectedDate?: Date | null;
  nextPeriodDate: Date | null;
  dayOfCycle: number;
  // Phase date ranges for UI rendering
  menstrualPhaseStart?: Date | null;
  menstrualPhaseEnd?: Date | null;
  follicularPhaseStart?: Date | null;
  follicularPhaseEnd?: Date | null;
  ovulationPhaseStart?: Date | null;
  ovulationPhaseEnd?: Date | null;
  lutealPhaseStart?: Date | null;
  lutealPhaseEnd?: Date | null;
  extendedFollicularPhaseStart?: Date | null;
  extendedFollicularPhaseEnd?: Date | null;
  // Next cycle menstrual phase for proper calendar rendering
  nextMenstrualPhaseStart?: Date | null;
  nextMenstrualPhaseEnd?: Date | null;
  updatedAt: Date;
}

export interface AIGeneratedSuggestion {
  cyclePhase: CyclePhase;
  partnerSupportStyle: string;
  dailyScheduleConstraints: string;
  suggestions: string[];
  generatedAt: Date;
}
