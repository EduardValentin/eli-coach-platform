export const EXERCISE_DIFFICULTIES = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;
export const EXERCISE_TAGS = ["Strength", "Hypertrophy", "Recovery"] as const;
export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Biceps",
  "Triceps",
] as const;
export const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbells",
  "Kettlebell",
  "Machine",
  "Cable",
  "Bands",
  "Bodyweight",
  "Bench",
] as const;
/** Describes how an exercise is loaded, not something the coach has to own (PRD §6). */
export const BODYWEIGHT_EQUIPMENT = "Bodyweight";
export const EXERCISE_NAME_MAX_LENGTH = 120;
export const EXERCISE_DESCRIPTION_MAX_LENGTH = 2000;

export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export function requiresEquipment(equipment: readonly string[]): boolean {
  return equipment.some((item) => item !== BODYWEIGHT_EQUIPMENT);
}

export function areMuscleSelectionsDisjoint(
  primary: readonly string[],
  secondary: readonly string[],
): boolean {
  return !primary.some((muscle) => secondary.includes(muscle));
}
