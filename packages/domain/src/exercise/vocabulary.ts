export const EXERCISE_TYPES = [
  "resistance",
  "cardio",
  "mobility",
  "stretching",
  "breathing",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_UNITS = ["reps", "time", "distance", "breaths"] as const;
export type ExerciseUnit = (typeof EXERCISE_UNITS)[number];

const UNITS_BY_TYPE: Record<
  ExerciseType,
  readonly [ExerciseUnit, ...ExerciseUnit[]]
> = {
  resistance: ["reps", "time", "distance"],
  cardio: ["time", "distance"],
  mobility: ["time", "reps"],
  stretching: ["time"],
  breathing: ["breaths", "time"],
};

export function unitsFor(type: ExerciseType): readonly ExerciseUnit[] {
  return UNITS_BY_TYPE[type];
}

export function defaultUnitFor(type: ExerciseType): ExerciseUnit {
  return UNITS_BY_TYPE[type][0];
}

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

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXERCISE_TAGS = ["Strength", "Hypertrophy", "Recovery"] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

export const MAX_EXERCISE_NAME_LENGTH = 80;
export const MAX_FORM_CUES_LENGTH = 1_000;
