export const EXERCISE_TYPES = [
  "resistance",
  "cardio",
  "mobility",
  "stretching",
  "breathing",
] as const;
type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_UNITS = ["reps", "time", "distance", "breaths"] as const;
type ExerciseUnit = (typeof EXERCISE_UNITS)[number];

export const MOVEMENT_PATTERNS = [
  "squat",
  "lunge",
  "hinge",
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
  "core",
  "carry",
  "isolation",
  "conditioning",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const EXERCISE_ROLES = [
  "main-compound",
  "secondary-compound",
  "isolation",
] as const;
export type ExerciseRole = (typeof EXERCISE_ROLES)[number];

export const MUSCLES = [
  "Chest",
  "Upper back",
  "Lats",
  "Lower back",
  "Traps",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core",
  "Obliques",
  "Glutes",
  "Quadriceps",
  "Hamstrings",
  "Adductors",
  "Abductors",
  "Hip flexors",
  "Calves",
  "Full body",
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  "Barbell",
  "Dumbbells",
  "Kettlebell",
  "EZ bar",
  "Trap bar",
  "Cable",
  "Machine",
  "Smith machine",
  "Bands",
  "Suspension trainer",
  "Pull-up bar",
  "Squat rack",
  "Bench",
  "Box or step",
  "Medicine ball",
  "Stability ball",
  "Mat",
  "Foam roller",
  "Treadmill",
  "Bike",
  "Rower",
  "Stair climber",
  "Jump rope",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EXERCISE_TAGS = [
  "Strength",
  "Hypertrophy",
  "Recovery",
  "Conditioning",
] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

export type LibraryExercise = {
  id: string;
  name: string;
  type: ExerciseType;
  unit: ExerciseUnit;
  perSide: boolean;
  pattern: MovementPattern | null;
  role: ExerciseRole | null;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  tags: ExerciseTag[];
  cues: string;
  videoPath: string | null;
  archived: boolean;
};
