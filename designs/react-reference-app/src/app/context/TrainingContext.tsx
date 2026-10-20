import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { bundleLengthLabel } from '../domain/bundles';
import type {
  Difficulty,
  Equipment,
  ExerciseRole,
  ExerciseTag,
  ExerciseType,
  Measure,
  MovementPattern,
  Muscle,
} from '../domain/exercises';
import { exercisesForSeed } from '../services/exerciseSamples';
import { ExerciseVideoServer, type ExerciseVideoAnswer } from '../services/exerciseVideoService';
import { useAppState } from './AppContext';
import {
  archivedItem,
  restoredItemIn,
  type LibraryDeletion,
} from '../domain/libraryLifecycle';

export interface Exercise {
  id: string;
  name: string;
  cues: string;
  type: ExerciseType;
  measuredIn: Measure;
  perSide: boolean;
  equipment: Equipment[];
  difficulty: Difficulty;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  pattern?: MovementPattern;
  role?: ExerciseRole;
  tags: ExerciseTag[];
  videoUrl?: string;
  thumbnailUrl?: string;
  archivedAt?: string;
}

export type GoalType = 'Muscle Building' | 'Fat Loss' | 'Strength' | 'Recomposition' | 'Maintenance' | 'Custom';

export const GOAL_TYPES: GoalType[] = ['Muscle Building', 'Fat Loss', 'Strength', 'Recomposition', 'Maintenance', 'Custom'];

// The type carries the goal's meaning on its own, so there is no separate
// free-text name to keep in sync with it.
export interface Goal {
  id: string;
  type: GoalType;
  clientId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed';
}

export type SubscriptionTier = '1-month' | '3-months' | '6-months';

export interface Subscription {
  id: string;
  clientId: string;
  tier: SubscriptionTier;
  months: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired';
}

export const subscriptionTermLabel = (s: Pick<Subscription, 'months'>): string =>
  bundleLengthLabel(s.months);

// ── Context interface ───────────────────────────────────────────

interface TrainingState {
  // Exercise library
  exercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
  updateExercise: (exercise: Exercise) => void;
  uploadExerciseVideo: (file: File, onProgress: (fraction: number) => void) => Promise<ExerciseVideoAnswer>;
  archiveExercise: (id: string) => void;
  restoreExercise: (id: string) => Exercise;
  deleteExercise: (id: string) => LibraryDeletion;

  // Goals
  goals: Goal[];
  createGoal: (clientId: string, type: GoalType) => Goal;
  completeGoal: (id: string) => void;

  // Subscriptions
  subscriptions: Subscription[];
  getClientSubscriptions: (clientId: string) => Subscription[];
  getClientActiveSubscription: (clientId: string) => Subscription | null;

  // Goal helpers
  getClientGoals: (clientId: string) => Goal[];
  getClientActiveGoal: (clientId: string) => Goal | null;
}

// ── Mock goals ──────────────────────────────────────────────────

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    type: 'Muscle Building',
    clientId: 'client-1',
    startDate: '2025-10-01',
    status: 'completed',
    endDate: '2025-12-20'
  },
  {
    id: 'goal-2',
    type: 'Recomposition',
    clientId: 'client-1',
    startDate: '2026-01-06',
    status: 'active'
  }
];

// ── Mock subscriptions ──────────────────────────────────────────

const mockSubscriptions: Subscription[] = [
  { id: 'sub-1', clientId: 'client-1', tier: '3-months', months: 3, startDate: '2025-10-01', endDate: '2025-12-31', status: 'expired' },
  { id: 'sub-2', clientId: 'client-1', tier: '6-months', months: 6, startDate: '2026-01-06', endDate: '2026-07-06', status: 'active' },
  { id: 'sub-3', clientId: 'c2', tier: '1-month', months: 1, startDate: '2026-06-01', endDate: '2026-07-01', status: 'active' },
  { id: 'sub-4', clientId: 'c3', tier: '3-months', months: 3, startDate: '2026-04-15', endDate: '2026-07-15', status: 'active' },
  { id: 'sub-5', clientId: 'c4', tier: '1-month', months: 1, startDate: '2025-01-10', endDate: '2025-02-10', status: 'expired' },
  { id: 'sub-6', clientId: 'c5', tier: '3-months', months: 3, startDate: '2025-03-22', endDate: '2025-06-22', status: 'expired' },
];

// ── Context ─────────────────────────────────────────────────────

const TrainingContext = createContext<TrainingState | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const [exercises, setExercises] = useState<Exercise[]>(() => exercisesForSeed(appState.exerciseSeed));

  useEffect(() => {
    setExercises(exercisesForSeed(appState.exerciseSeed));
  }, [appState.exerciseSeed]);
  const [videoServer] = useState(() => new ExerciseVideoServer());

  useEffect(() => {
    videoServer.releaseHeldUploads(appState.exerciseVideoUpload);
  }, [videoServer, appState.exerciseVideoUpload]);
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [subscriptions] = useState<Subscription[]>(mockSubscriptions);

  // ── Exercise CRUD ───────────────────────────────────────────
  const addExercise = useCallback((exercise: Exercise) =>
    setExercises(prev => [...prev, exercise]), []);
  const updateExercise = useCallback((exercise: Exercise) =>
    setExercises(prev => prev.map(e => e.id === exercise.id ? exercise : e)), []);
  const uploadExerciseVideo = useCallback(
    (file: File, onProgress: (fraction: number) => void) =>
      videoServer.upload(file, { outcome: appState.exerciseVideoUpload, onProgress }),
    [videoServer, appState.exerciseVideoUpload],
  );
  const archiveExercise = useCallback((id: string) =>
    setExercises(prev => prev.map(e => e.id === id ? archivedItem(e, new Date()) : e)), []);
  const restoreExercise = useCallback((id: string): Exercise => {
    const restored = restoredItemIn(exercises, id);
    setExercises(prev => prev.map(e => e.id === id ? restored : e));
    return restored;
  }, [exercises]);
  const deleteExercise = useCallback((id: string): LibraryDeletion => {
    setExercises(prev => prev.filter(e => e.id !== id));
    return 'deleted';
  }, []);

  // ── Goal methods ────────────────────────────────────────────
  const createGoal = useCallback((clientId: string, type: GoalType): Goal => {
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      type,
      clientId,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };
    setGoals(prev => [...prev, goal]);
    return goal;
  }, []);

  const completeGoal = useCallback((id: string) =>
    setGoals(prev => prev.map(g =>
      g.id === id
        ? { ...g, status: 'completed' as const, endDate: new Date().toISOString().split('T')[0] }
        : g
    )), []);

  const getClientGoals = useCallback((clientId: string): Goal[] =>
    goals.filter(g => g.clientId === clientId),
    [goals]);

  const getClientActiveGoal = useCallback((clientId: string): Goal | null =>
    goals.find(g => g.clientId === clientId && g.status === 'active') || null,
    [goals]);

  const getClientSubscriptions = useCallback((clientId: string): Subscription[] =>
    subscriptions.filter(s => s.clientId === clientId),
    [subscriptions]);

  const getClientActiveSubscription = useCallback((clientId: string): Subscription | null =>
    subscriptions.find(s => s.clientId === clientId && s.status === 'active') || null,
    [subscriptions]);

  return (
    <TrainingContext.Provider value={{
      exercises,
      addExercise, updateExercise, uploadExerciseVideo, archiveExercise, restoreExercise, deleteExercise,
      goals,
      createGoal, completeGoal,
      subscriptions, getClientSubscriptions, getClientActiveSubscription,
      getClientGoals, getClientActiveGoal,
    }}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}
