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
];
