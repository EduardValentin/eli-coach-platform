import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ── Exercise types (unchanged) ──────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  description: string;
  equipment: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tags?: string[];
  videoUrl?: string;
}

// ── Plan building-block types (unchanged) ───────────────────────

export type DayType = 'Rest' | 'Recovery' | 'Strength' | 'Hypertrophy' | 'Lighter';

export interface PlanExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  rir: number;
  supersetId?: string;
  notes?: string;
}

export interface PlanDay {
  id: string;
  dayOfWeek: number; // 0 = Mon, 1 = Tue, etc.
  type: DayType;
  exercises: PlanExercise[];
}

export interface PlanWeek {
  id: string;
  order: number;
  isDeload: boolean;
  days: PlanDay[];
}

// ── New types ───────────────────────────────────────────────────

export type GoalType = 'Muscle Building' | 'Fat Loss' | 'Strength' | 'Recomposition' | 'Maintenance' | 'Custom';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  clientId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed';
}

export interface PlanTemplate {
  id: string;
  name: string;
  description?: string;
  weeks: PlanWeek[];
  createdAt: string;
  tags?: string[];
}

export interface PlanInstance {
  id: string;
  clientId: string;
  templateId?: string;
  goalId: string;
  name: string;
  status: 'active' | 'completed';
  weeks: PlanWeek[];
  startDate: string;
  endDate?: string;
  currentWeekNumber: number;
}

// ── Context interface ───────────────────────────────────────────

interface TrainingState {
  // Exercise library
  exercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
  updateExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;

  // Plan templates
  planTemplates: PlanTemplate[];
  addTemplate: (template: PlanTemplate) => void;
  updateTemplate: (template: PlanTemplate) => void;
  deleteTemplate: (id: string) => void;

  // Plan instances
  planInstances: PlanInstance[];
  createPlanInstance: (clientId: string, goalId: string, name: string, templateId?: string) => PlanInstance;
  updatePlanInstance: (instance: PlanInstance) => void;
  completePlanInstance: (id: string) => void;
  addWeeksToInstance: (instanceId: string, weeks: PlanWeek[]) => void;

  // Goals
  goals: Goal[];
  createGoal: (clientId: string, name: string, type: GoalType) => Goal;
  completeGoal: (id: string) => void;

  // Computed helpers
  getClientActivePlan: (clientId: string) => PlanInstance | null;
  getClientPastPlans: (clientId: string) => PlanInstance[];
  getClientGoals: (clientId: string) => Goal[];
  getClientActiveGoal: (clientId: string) => Goal | null;

  // Mocked client shortcut (for portal views)
  clientActivePlan: PlanInstance | null;
}

// ── Mock exercises ──────────────────────────────────────────────

const mockExercises: Exercise[] = [
  {
    id: 'e1',
    name: 'Barbell Back Squat',
    description: 'A compound lower body exercise that targets the quads, glutes, and core.',
    equipment: ['Barbell', 'Squat Rack'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Core', 'Hamstrings'],
    tags: ['Strength', 'Hypertrophy'],
    videoUrl: 'demo-video-1.mp4'
  },
  {
    id: 'e2',
    name: 'Romanian Deadlift',
    description: 'Hip-hinge movement focusing on the posterior chain.',
    equipment: ['Barbell'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Hamstrings', 'Glutes'],
    secondaryMuscles: ['Lower Back'],
    tags: ['Strength', 'Recovery'],
    videoUrl: 'demo-video-2.mp4'
  },
  {
    id: 'e3',
    name: 'Bulgarian Split Squat',
    description: 'Unilateral leg exercise for developing balance and leg strength.',
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'Advanced',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Core', 'Calves'],
    tags: ['Hypertrophy']
  },
  {
    id: 'e4',
    name: 'Barbell Bench Press',
    description: 'Upper body pushing compound for chest, shoulders, and triceps.',
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Chest', 'Triceps'],
    secondaryMuscles: ['Shoulders'],
    tags: ['Strength', 'Hypertrophy'],
    videoUrl: 'demo-video-4.mp4'
  },
  {
    id: 'e5',
    name: 'Overhead Press',
    description: 'Standing barbell press for shoulder strength and stability.',
    equipment: ['Barbell'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Shoulders', 'Triceps'],
    secondaryMuscles: ['Core'],
    tags: ['Strength']
  },
  {
    id: 'e6',
    name: 'Pull-Ups',
    description: 'Bodyweight vertical pull for back width and arm strength.',
    equipment: ['Pull-Up Bar'],
    difficulty: 'Advanced',
    primaryMuscles: ['Lats', 'Biceps'],
    secondaryMuscles: ['Rhomboids', 'Core'],
    tags: ['Strength']
  },
  {
    id: 'e7',
    name: 'Dumbbell Rows',
    description: 'Single-arm rowing movement for upper back thickness.',
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'Beginner',
    primaryMuscles: ['Lats', 'Rhomboids'],
    secondaryMuscles: ['Biceps', 'Core'],
    tags: ['Hypertrophy']
  },
  {
    id: 'e8',
    name: 'Lateral Raises',
    description: 'Isolation movement for the lateral deltoids.',
    equipment: ['Dumbbells'],
    difficulty: 'Beginner',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: [],
    tags: ['Hypertrophy']
  },
  {
    id: 'e9',
    name: 'Hip Thrust',
    description: 'Glute-focused hip extension movement with barbell loading.',
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Glutes', 'Hamstrings'],
    secondaryMuscles: ['Core'],
    tags: ['Strength', 'Hypertrophy'],
    videoUrl: 'demo-video-9.mp4'
  },
  {
    id: 'e10',
    name: 'Leg Press',
    description: 'Machine-based lower body compound for quads and glutes.',
    equipment: ['Machine'],
    difficulty: 'Beginner',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings'],
    tags: ['Hypertrophy']
  },
  {
    id: 'e11',
    name: 'Walking Lunges',
    description: 'Dynamic unilateral lower body exercise for strength and balance.',
    equipment: ['Dumbbells'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Core', 'Calves'],
    tags: ['Hypertrophy']
  },
  {
    id: 'e12',
    name: 'Plank',
    description: 'Isometric core hold for deep stabilizer activation.',
    equipment: [],
    difficulty: 'Beginner',
    primaryMuscles: ['Core'],
    secondaryMuscles: ['Shoulders'],
    tags: ['Recovery']
  }
];

// ── Mock templates ──────────────────────────────────────────────

const makeRestDays = (weekId: string): PlanDay[] => [
  { id: `${weekId}-d0`, dayOfWeek: 0, type: 'Rest', exercises: [] },
  { id: `${weekId}-d1`, dayOfWeek: 1, type: 'Rest', exercises: [] },
  { id: `${weekId}-d2`, dayOfWeek: 2, type: 'Rest', exercises: [] },
  { id: `${weekId}-d3`, dayOfWeek: 3, type: 'Rest', exercises: [] },
  { id: `${weekId}-d4`, dayOfWeek: 4, type: 'Rest', exercises: [] },
  { id: `${weekId}-d5`, dayOfWeek: 5, type: 'Rest', exercises: [] },
  { id: `${weekId}-d6`, dayOfWeek: 6, type: 'Rest', exercises: [] },
];

const templateWeek1Days: PlanDay[] = [
  { id: 'tw1-d0', dayOfWeek: 0, type: 'Strength', exercises: [
    { id: 'tpe1', exerciseId: 'e1', sets: 4, reps: '8-10', rir: 2 },
    { id: 'tpe2', exerciseId: 'e2', sets: 3, reps: '10-12', rir: 2, supersetId: 'tss1' },
    { id: 'tpe3', exerciseId: 'e3', sets: 3, reps: '10/leg', rir: 1, supersetId: 'tss1' }
  ] },
  { id: 'tw1-d1', dayOfWeek: 1, type: 'Lighter', exercises: [
    { id: 'tpe4', exerciseId: 'e12', sets: 3, reps: '30s hold', rir: 0 }
  ] },
  { id: 'tw1-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
  { id: 'tw1-d3', dayOfWeek: 3, type: 'Hypertrophy', exercises: [
    { id: 'tpe5', exerciseId: 'e4', sets: 4, reps: '10-12', rir: 2, notes: 'Pause at the bottom for 1 second' },
    { id: 'tpe6', exerciseId: 'e8', sets: 3, reps: '15', rir: 1 },
    { id: 'tpe7', exerciseId: 'e7', sets: 3, reps: '12/arm', rir: 2 }
  ] },
  { id: 'tw1-d4', dayOfWeek: 4, type: 'Recovery', exercises: [
    { id: 'tpe8', exerciseId: 'e12', sets: 3, reps: '30s hold', rir: 0 }
  ] },
  { id: 'tw1-d5', dayOfWeek: 5, type: 'Rest', exercises: [] },
  { id: 'tw1-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
];

const templateWeek2Days: PlanDay[] = [
  { id: 'tw2-d0', dayOfWeek: 0, type: 'Strength', exercises: [
    { id: 'tpe9', exerciseId: 'e9', sets: 4, reps: '10-12', rir: 2 },
    { id: 'tpe10', exerciseId: 'e10', sets: 3, reps: '12-15', rir: 1 },
    { id: 'tpe11', exerciseId: 'e11', sets: 3, reps: '12/leg', rir: 2 }
  ] },
  { id: 'tw2-d1', dayOfWeek: 1, type: 'Lighter', exercises: [
    { id: 'tpe12', exerciseId: 'e12', sets: 3, reps: '45s hold', rir: 0 }
  ] },
  { id: 'tw2-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
  { id: 'tw2-d3', dayOfWeek: 3, type: 'Hypertrophy', exercises: [
    { id: 'tpe13', exerciseId: 'e5', sets: 4, reps: '8-10', rir: 2 },
    { id: 'tpe14', exerciseId: 'e6', sets: 3, reps: '6-8', rir: 2, supersetId: 'tss2' },
    { id: 'tpe15', exerciseId: 'e8', sets: 3, reps: '15', rir: 1, supersetId: 'tss2' }
  ] },
  { id: 'tw2-d4', dayOfWeek: 4, type: 'Recovery', exercises: [
    { id: 'tpe16', exerciseId: 'e12', sets: 3, reps: '30s hold', rir: 0 }
  ] },
  { id: 'tw2-d5', dayOfWeek: 5, type: 'Rest', exercises: [] },
  { id: 'tw2-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
];

const mockTemplates: PlanTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Women\'s Sculpt & Strength',
    description: 'A balanced program alternating strength and hypertrophy with adequate recovery.',
    weeks: [
      { id: 'tw1', order: 1, isDeload: false, days: templateWeek1Days },
      { id: 'tw2', order: 2, isDeload: false, days: templateWeek2Days },
    ],
    createdAt: '2025-08-15',
    tags: ['Strength', 'Hypertrophy', 'Women']
  },
  {
    id: 'tmpl-2',
    name: 'Upper/Lower Split - Beginner',
    description: 'Simple 4-day upper/lower split designed for beginners.',
    weeks: [
      {
        id: 'tw3', order: 1, isDeload: false,
        days: [
          { id: 'tw3-d0', dayOfWeek: 0, type: 'Strength', exercises: [
            { id: 'tpe20', exerciseId: 'e4', sets: 3, reps: '8-10', rir: 3 },
            { id: 'tpe21', exerciseId: 'e5', sets: 3, reps: '8-10', rir: 3 },
            { id: 'tpe22', exerciseId: 'e7', sets: 3, reps: '10-12', rir: 2 },
          ] },
          { id: 'tw3-d1', dayOfWeek: 1, type: 'Hypertrophy', exercises: [
            { id: 'tpe23', exerciseId: 'e1', sets: 3, reps: '10-12', rir: 2 },
            { id: 'tpe24', exerciseId: 'e2', sets: 3, reps: '10-12', rir: 2 },
            { id: 'tpe25', exerciseId: 'e10', sets: 3, reps: '12-15', rir: 1 },
          ] },
          { id: 'tw3-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
          { id: 'tw3-d3', dayOfWeek: 3, type: 'Strength', exercises: [
            { id: 'tpe26', exerciseId: 'e6', sets: 3, reps: '5-8', rir: 3 },
            { id: 'tpe27', exerciseId: 'e8', sets: 3, reps: '12-15', rir: 1 },
          ] },
          { id: 'tw3-d4', dayOfWeek: 4, type: 'Hypertrophy', exercises: [
            { id: 'tpe28', exerciseId: 'e9', sets: 3, reps: '12-15', rir: 2 },
            { id: 'tpe29', exerciseId: 'e11', sets: 3, reps: '12/leg', rir: 2 },
          ] },
          { id: 'tw3-d5', dayOfWeek: 5, type: 'Rest', exercises: [] },
          { id: 'tw3-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
        ]
      }
    ],
    createdAt: '2025-09-01',
    tags: ['Beginner', 'Upper/Lower']
  }
];

// ── Mock goals ──────────────────────────────────────────────────

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    name: 'Hypertrophy Phase 1',
    type: 'Muscle Building',
    clientId: 'client-1',
    startDate: '2025-10-01',
    status: 'completed',
    endDate: '2025-12-20'
  },
  {
    id: 'goal-2',
    name: 'Strength & Recomp Block',
    type: 'Recomposition',
    clientId: 'client-1',
    startDate: '2026-01-06',
    status: 'active'
  }
];

// ── Mock plan instances ─────────────────────────────────────────

const mockPlanInstances: PlanInstance[] = [
  // Completed past plan for client-1
  {
    id: 'pi-past-1',
    clientId: 'client-1',
    templateId: 'tmpl-1',
    goalId: 'goal-1',
    name: 'Women\'s Sculpt & Strength - Jane',
    status: 'completed',
    startDate: '2025-10-01',
    endDate: '2025-12-20',
    currentWeekNumber: 4,
    weeks: [
      { id: 'past-w1', order: 1, isDeload: false, days: makeRestDays('past-w1') },
      { id: 'past-w2', order: 2, isDeload: false, days: makeRestDays('past-w2') },
      { id: 'past-w3', order: 3, isDeload: false, days: makeRestDays('past-w3') },
      { id: 'past-w4', order: 4, isDeload: true, days: makeRestDays('past-w4') },
    ]
  },
  // Active plan for client-1 (3 weeks added iteratively)
  {
    id: 'pi-active-1',
    clientId: 'client-1',
    templateId: 'tmpl-1',
    goalId: 'goal-2',
    name: 'Strength & Recomp - Jane',
    status: 'active',
    startDate: '2026-01-06',
    currentWeekNumber: 2,
    weeks: [
      {
        id: 'act-w1', order: 1, isDeload: false,
        days: [
          { id: 'aw1-d0', dayOfWeek: 0, type: 'Strength', exercises: [
            { id: 'ape1', exerciseId: 'e1', sets: 4, reps: '6-8', rir: 2 },
            { id: 'ape2', exerciseId: 'e2', sets: 4, reps: '8-10', rir: 2, supersetId: 'ass1' },
            { id: 'ape3', exerciseId: 'e3', sets: 3, reps: '10/leg', rir: 1, supersetId: 'ass1' }
          ] },
          { id: 'aw1-d1', dayOfWeek: 1, type: 'Lighter', exercises: [
            { id: 'ape4', exerciseId: 'e12', sets: 3, reps: '45s hold', rir: 0 },
            { id: 'ape5', exerciseId: 'e11', sets: 2, reps: '10/leg', rir: 3 }
          ] },
          { id: 'aw1-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
          { id: 'aw1-d3', dayOfWeek: 3, type: 'Hypertrophy', exercises: [
            { id: 'ape6', exerciseId: 'e4', sets: 4, reps: '10-12', rir: 2, notes: 'Control the eccentric - 2 sec down' },
            { id: 'ape7', exerciseId: 'e5', sets: 3, reps: '8-10', rir: 2 },
            { id: 'ape8', exerciseId: 'e8', sets: 3, reps: '15', rir: 1 },
            { id: 'ape9', exerciseId: 'e7', sets: 3, reps: '12/arm', rir: 2 }
          ] },
          { id: 'aw1-d4', dayOfWeek: 4, type: 'Strength', exercises: [
            { id: 'ape10', exerciseId: 'e9', sets: 4, reps: '8-10', rir: 2 },
            { id: 'ape11', exerciseId: 'e10', sets: 3, reps: '12-15', rir: 1 },
          ] },
          { id: 'aw1-d5', dayOfWeek: 5, type: 'Recovery', exercises: [
            { id: 'ape12', exerciseId: 'e12', sets: 3, reps: '60s hold', rir: 0 }
          ] },
          { id: 'aw1-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
        ]
      },
      {
        id: 'act-w2', order: 2, isDeload: false,
        days: [
          { id: 'aw2-d0', dayOfWeek: 0, type: 'Strength', exercises: [
            { id: 'ape13', exerciseId: 'e1', sets: 4, reps: '5-7', rir: 2, notes: 'Increase weight from week 1' },
            { id: 'ape14', exerciseId: 'e2', sets: 4, reps: '8-10', rir: 2, supersetId: 'ass2' },
            { id: 'ape15', exerciseId: 'e3', sets: 3, reps: '10/leg', rir: 1, supersetId: 'ass2' }
          ] },
          { id: 'aw2-d1', dayOfWeek: 1, type: 'Lighter', exercises: [
            { id: 'ape16', exerciseId: 'e12', sets: 3, reps: '45s hold', rir: 0 },
            { id: 'ape17', exerciseId: 'e11', sets: 2, reps: '10/leg', rir: 3 }
          ] },
          { id: 'aw2-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
          { id: 'aw2-d3', dayOfWeek: 3, type: 'Hypertrophy', exercises: [
            { id: 'ape18', exerciseId: 'e4', sets: 4, reps: '10-12', rir: 1, notes: 'Push closer to failure this week' },
            { id: 'ape19', exerciseId: 'e5', sets: 3, reps: '8-10', rir: 2 },
            { id: 'ape20', exerciseId: 'e8', sets: 4, reps: '15', rir: 1 },
            { id: 'ape21', exerciseId: 'e7', sets: 3, reps: '12/arm', rir: 2 }
          ] },
          { id: 'aw2-d4', dayOfWeek: 4, type: 'Strength', exercises: [
            { id: 'ape22', exerciseId: 'e9', sets: 4, reps: '8-10', rir: 1, notes: 'Add 2.5kg from last week' },
            { id: 'ape23', exerciseId: 'e10', sets: 4, reps: '12-15', rir: 1 },
          ] },
          { id: 'aw2-d5', dayOfWeek: 5, type: 'Recovery', exercises: [
            { id: 'ape24', exerciseId: 'e12', sets: 3, reps: '60s hold', rir: 0 }
          ] },
          { id: 'aw2-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
        ]
      },
      {
        id: 'act-w3', order: 3, isDeload: true,
        days: [
          { id: 'aw3-d0', dayOfWeek: 0, type: 'Lighter', exercises: [
            { id: 'ape25', exerciseId: 'e1', sets: 3, reps: '8-10', rir: 4, notes: 'Deload - reduce weight by 40%' },
            { id: 'ape26', exerciseId: 'e3', sets: 2, reps: '10/leg', rir: 4 }
          ] },
          { id: 'aw3-d1', dayOfWeek: 1, type: 'Rest', exercises: [] },
          { id: 'aw3-d2', dayOfWeek: 2, type: 'Rest', exercises: [] },
          { id: 'aw3-d3', dayOfWeek: 3, type: 'Lighter', exercises: [
            { id: 'ape27', exerciseId: 'e4', sets: 3, reps: '10-12', rir: 4, notes: 'Deload - light and controlled' },
            { id: 'ape28', exerciseId: 'e8', sets: 2, reps: '12', rir: 3 }
          ] },
          { id: 'aw3-d4', dayOfWeek: 4, type: 'Rest', exercises: [] },
          { id: 'aw3-d5', dayOfWeek: 5, type: 'Recovery', exercises: [
            { id: 'ape29', exerciseId: 'e12', sets: 2, reps: '30s hold', rir: 0 }
          ] },
          { id: 'aw3-d6', dayOfWeek: 6, type: 'Rest', exercises: [] },
        ]
      }
    ]
  }
];

// ── Context ─────────────────────────────────────────────────────

const TrainingContext = createContext<TrainingState | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(mockExercises);
  const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>(mockTemplates);
  const [planInstances, setPlanInstances] = useState<PlanInstance[]>(mockPlanInstances);
  const [goals, setGoals] = useState<Goal[]>(mockGoals);

  // ── Exercise CRUD ───────────────────────────────────────────
  const addExercise = useCallback((exercise: Exercise) =>
    setExercises(prev => [...prev, exercise]), []);
  const updateExercise = useCallback((exercise: Exercise) =>
    setExercises(prev => prev.map(e => e.id === exercise.id ? exercise : e)), []);
  const deleteExercise = useCallback((id: string) =>
    setExercises(prev => prev.filter(e => e.id !== id)), []);

  // ── Template CRUD ───────────────────────────────────────────
  const addTemplate = useCallback((template: PlanTemplate) =>
    setPlanTemplates(prev => [...prev, template]), []);
  const updateTemplate = useCallback((template: PlanTemplate) =>
    setPlanTemplates(prev => prev.map(t => t.id === template.id ? template : t)), []);
  const deleteTemplate = useCallback((id: string) =>
    setPlanTemplates(prev => prev.filter(t => t.id !== id)), []);

  // ── Plan Instance methods ───────────────────────────────────
  const createPlanInstance = useCallback((
    clientId: string, goalId: string, name: string, templateId?: string
  ): PlanInstance => {
    const template = templateId
      ? planTemplates.find(t => t.id === templateId)
      : undefined;

    // Deep-clone template weeks with new IDs if cloning
    const clonedWeeks: PlanWeek[] = template
      ? template.weeks.map((w, wi) => ({
          ...w,
          id: `pi-${Date.now()}-w${wi}`,
          days: w.days.map((d, di) => ({
            ...d,
            id: `pi-${Date.now()}-w${wi}-d${di}`,
            exercises: d.exercises.map((ex, ei) => ({
              ...ex,
              id: `pi-${Date.now()}-w${wi}-d${di}-e${ei}`,
              supersetId: ex.supersetId ? `pi-${Date.now()}-${ex.supersetId}` : undefined
            }))
          }))
        }))
      : [];

    const instance: PlanInstance = {
      id: `pi-${Date.now()}`,
      clientId,
      templateId,
      goalId,
      name,
      status: 'active',
      weeks: clonedWeeks,
      startDate: new Date().toISOString().split('T')[0],
      currentWeekNumber: 1,
    };

    setPlanInstances(prev => [...prev, instance]);
    return instance;
  }, [planTemplates]);

  const updatePlanInstance = useCallback((instance: PlanInstance) =>
    setPlanInstances(prev => prev.map(p => p.id === instance.id ? instance : p)), []);

  const completePlanInstance = useCallback((id: string) =>
    setPlanInstances(prev => prev.map(p =>
      p.id === id
        ? { ...p, status: 'completed' as const, endDate: new Date().toISOString().split('T')[0] }
        : p
    )), []);

  const addWeeksToInstance = useCallback((instanceId: string, weeks: PlanWeek[]) =>
    setPlanInstances(prev => prev.map(p => {
      if (p.id !== instanceId) return p;
      const maxOrder = p.weeks.length > 0
        ? Math.max(...p.weeks.map(w => w.order))
        : 0;
      const reorderedWeeks = weeks.map((w, i) => ({ ...w, order: maxOrder + i + 1 }));
      return { ...p, weeks: [...p.weeks, ...reorderedWeeks] };
    })), []);

  // ── Goal methods ────────────────────────────────────────────
  const createGoal = useCallback((clientId: string, name: string, type: GoalType): Goal => {
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      name,
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

  // ── Computed helpers ────────────────────────────────────────
  const getClientActivePlan = useCallback((clientId: string): PlanInstance | null =>
    planInstances.find(p => p.clientId === clientId && p.status === 'active') || null,
    [planInstances]);

  const getClientPastPlans = useCallback((clientId: string): PlanInstance[] =>
    planInstances.filter(p => p.clientId === clientId && p.status === 'completed'),
    [planInstances]);

  const getClientGoals = useCallback((clientId: string): Goal[] =>
    goals.filter(g => g.clientId === clientId),
    [goals]);

  const getClientActiveGoal = useCallback((clientId: string): Goal | null =>
    goals.find(g => g.clientId === clientId && g.status === 'active') || null,
    [goals]);

  const clientActivePlan = getClientActivePlan('client-1');

  return (
    <TrainingContext.Provider value={{
      exercises,
      addExercise, updateExercise, deleteExercise,
      planTemplates,
      addTemplate, updateTemplate, deleteTemplate,
      planInstances,
      createPlanInstance, updatePlanInstance, completePlanInstance, addWeeksToInstance,
      goals,
      createGoal, completeGoal,
      getClientActivePlan, getClientPastPlans, getClientGoals, getClientActiveGoal,
      clientActivePlan
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
