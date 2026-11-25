import type { ExerciseFields } from "./exercise-requests";

const RESISTANCE = {
  type: "resistance",
  unit: "reps",
  perSide: false,
  secondaryMuscles: [],
  difficulty: "Beginner",
  tags: ["Strength"],
  cues: "Brace and breathe",
} as const;

const RECOVERY = {
  type: "mobility",
  unit: "time",
  perSide: false,
  secondaryMuscles: [],
  difficulty: "Beginner",
  tags: ["Recovery"],
  cues: "Move slowly",
  equipment: [],
  pattern: null,
  role: null,
} as const;

export const SESSION_LIBRARY: readonly ExerciseFields[] = [
  {
    ...RESISTANCE,
    name: "Back squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Barbell"],
    pattern: "squat",
    role: "main-compound",
  },
  {
    ...RESISTANCE,
    name: "Lateral raise",
    primaryMuscles: ["Shoulders"],
    equipment: ["Dumbbells"],
    pattern: "isolation",
    role: "isolation",
  },
  {
    ...RESISTANCE,
    name: "Calf raise",
    primaryMuscles: ["Calves"],
    equipment: ["Machine"],
    pattern: "isolation",
    role: "isolation",
  },
  {
    ...RESISTANCE,
    name: "Plank",
    unit: "time",
    primaryMuscles: ["Core"],
    equipment: ["Mat"],
    pattern: "core",
    role: "isolation",
  },
  {
    ...RESISTANCE,
    name: "Front squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Barbell"],
    pattern: "squat",
    role: "main-compound",
  },
  {
    ...RESISTANCE,
    name: "Goblet squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Dumbbells"],
    pattern: "squat",
    role: "main-compound",
  },
  {
    ...RESISTANCE,
    name: "Hack squat",
    primaryMuscles: ["Quadriceps"],
    equipment: ["Machine"],
    pattern: "squat",
    role: "main-compound",
  },
  {
    ...RECOVERY,
    name: "Couch stretch",
    type: "stretching",
    primaryMuscles: ["Hip flexors"],
  },
];

const MOBILITY_NAMES = [
  "Hip circles",
  "Cat cow",
  "Thoracic rotation",
  "Ankle rocks",
  "Leg swings",
] as const;

export const WARM_UP_LIBRARY: readonly ExerciseFields[] = MOBILITY_NAMES.map(
  (name) => ({
    ...RECOVERY,
    name,
    primaryMuscles: ["Lower back"],
  }),
);

export const CARDIO_EXERCISE: ExerciseFields = {
  name: "Stationary bike",
  type: "cardio",
  unit: "time",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: ["Bike"],
  difficulty: "Beginner",
  pattern: null,
  role: null,
  tags: [],
  cues: "Keep a steady pace",
};
