import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export type DayType = 'Rest' | 'Recovery' | 'Strength' | 'Hypertrophy' | 'Lighter';

export interface PlanExercise {
  id: string; // unique ID for this instance in the plan
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

export interface Plan {
  id: string;
  name: string;
  durationWeeks: number;
  weeks: PlanWeek[];
  assignedClients: string[];
}

interface TrainingState {
  exercises: Exercise[];
  plans: Plan[];
  addExercise: (exercise: Exercise) => void;
  updateExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  addPlan: (plan: Plan) => void;
  updatePlan: (plan: Plan) => void;
  deletePlan: (id: string) => void;
  assignPlanToClient: (planId: string, clientId: string) => void;
  clientActivePlan: Plan | null; // For the mocked client
}

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

const mockPlans: Plan[] = [
  {
    id: 'p1',
    name: 'Women\'s Sculpt & Strength - Phase 1',
    durationWeeks: 5,
    assignedClients: ['client-1'],
    weeks: [
      {
        id: 'w1',
        order: 1,
        isDeload: false,
        days: [
          { id: 'd1', dayOfWeek: 0, type: 'Strength', exercises: [
            { id: 'pe1', exerciseId: 'e1', sets: 4, reps: '8-10', rir: 2 },
            { id: 'pe2', exerciseId: 'e2', sets: 3, reps: '10-12', rir: 2, supersetId: 'ss1' },
            { id: 'pe3', exerciseId: 'e3', sets: 3, reps: '10/leg', rir: 1, supersetId: 'ss1' }
          ] },
          { id: 'd2', dayOfWeek: 1, type: 'Lighter', exercises: [] },
          { id: 'd3', dayOfWeek: 2, type: 'Rest', exercises: [] },
          { id: 'd4', dayOfWeek: 3, type: 'Hypertrophy', exercises: [
            { id: 'pe4', exerciseId: 'e4', sets: 4, reps: '10-12', rir: 2, notes: 'Pause at the bottom for 1 second' },
            { id: 'pe5', exerciseId: 'e8', sets: 3, reps: '15', rir: 1 },
            { id: 'pe6', exerciseId: 'e7', sets: 3, reps: '12/arm', rir: 2 }
          ] },
          { id: 'd5', dayOfWeek: 4, type: 'Recovery', exercises: [
            { id: 'pe7', exerciseId: 'e12', sets: 3, reps: '30s hold', rir: 0 }
          ] },
          { id: 'd6', dayOfWeek: 5, type: 'Rest', exercises: [] },
          { id: 'd7', dayOfWeek: 6, type: 'Rest', exercises: [] },
        ]
      }
    ]
  }
];

const TrainingContext = createContext<TrainingState | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(mockExercises);
  const [plans, setPlans] = useState<Plan[]>(mockPlans);

  const addExercise = (exercise: Exercise) => setExercises(prev => [...prev, exercise]);
  const updateExercise = (exercise: Exercise) => setExercises(prev => prev.map(e => e.id === exercise.id ? exercise : e));
  const deleteExercise = (id: string) => setExercises(prev => prev.filter(e => e.id !== id));

  const addPlan = (plan: Plan) => setPlans(prev => [...prev, plan]);
  const updatePlan = (plan: Plan) => setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
  const deletePlan = (id: string) => setPlans(prev => prev.filter(p => p.id !== id));

  const assignPlanToClient = (planId: string, clientId: string) => {
    setPlans(prev => prev.map(p => {
      // Remove client from any other plans first (since they can only have 1)
      const isCurrentlyAssigned = p.id === planId;
      const newAssignedClients = isCurrentlyAssigned
        ? [...new Set([...p.assignedClients, clientId])]
        : p.assignedClients.filter(id => id !== clientId);

      return { ...p, assignedClients: newAssignedClients };
    }));
  };

  const clientActivePlan = plans.find(p => p.assignedClients.includes('client-1')) || null;

  return (
    <TrainingContext.Provider value={{
      exercises, plans,
      addExercise, updateExercise, deleteExercise,
      addPlan, updatePlan, deletePlan,
      assignPlanToClient,
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
