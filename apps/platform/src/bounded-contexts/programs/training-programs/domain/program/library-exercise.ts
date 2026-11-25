type ExerciseType =
  "resistance" | "cardio" | "mobility" | "stretching" | "breathing";

type ExerciseUnit = "reps" | "time" | "distance" | "breaths";

export type MovementPattern =
  | "squat"
  | "lunge"
  | "hinge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "core"
  | "carry"
  | "isolation"
  | "conditioning";

export type ExerciseRole = "main-compound" | "secondary-compound" | "isolation";

export type Muscle =
  | "Chest"
  | "Upper back"
  | "Lats"
  | "Lower back"
  | "Traps"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Core"
  | "Obliques"
  | "Glutes"
  | "Quadriceps"
  | "Hamstrings"
  | "Adductors"
  | "Abductors"
  | "Hip flexors"
  | "Calves"
  | "Full body";

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

export type ExerciseTag =
  "Strength" | "Hypertrophy" | "Recovery" | "Conditioning";

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
