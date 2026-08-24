import type { Exercise } from '../context/TrainingContext';

/** The goal tags a coach can assign to an exercise (PRD §6, Exercise data model). */
export const EXERCISE_TAGS = ['Strength', 'Hypertrophy', 'Recovery'] as const;

/**
 * The equipment condition, expressed as one switch: off places no constraint,
 * on narrows to equipment-free exercises. An equipment-only view is not offered
 * — the complement of the switch is the unfiltered library.
 */
export const NO_EQUIPMENT_FILTER = 'No Equipment';

export type ExerciseTag = (typeof EXERCISE_TAGS)[number];
export type ExerciseFilter = ExerciseTag | typeof NO_EQUIPMENT_FILTER;

/**
 * Entries that describe how an exercise is loaded rather than something a coach
 * has to own. "Bodyweight" reads as equipment-free in gym vernacular, so an
 * exercise a coach marks Bodyweight belongs in the no-equipment view; "None" is
 * the explicit marker for the same thing.
 */
const EQUIPMENT_FREE_MARKERS: readonly string[] = ['None', 'Bodyweight'];

function requiresEquipment(exercise: Exercise): boolean {
  return exercise.equipment.some(item => !EQUIPMENT_FREE_MARKERS.includes(item));
}

const isExerciseTag = (filter: ExerciseFilter): filter is ExerciseTag =>
  (EXERCISE_TAGS as readonly string[]).includes(filter);

function matchesSearch(exercise: Exercise, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;
  return (
    exercise.name.toLowerCase().includes(query) ||
    exercise.primaryMuscles.some(muscle => muscle.toLowerCase().includes(query))
  );
}

function matchesTags(exercise: Exercise, activeFilters: ExerciseFilter[]): boolean {
  const selectedTags = activeFilters.filter(isExerciseTag);
  if (selectedTags.length === 0) return true;
  return selectedTags.some(tag => exercise.tags?.includes(tag));
}

function matchesEquipment(exercise: Exercise, activeFilters: ExerciseFilter[]): boolean {
  if (!activeFilters.includes(NO_EQUIPMENT_FILTER)) return true;
  return !requiresEquipment(exercise);
}

/**
 * The single rule behind both exercise-library surfaces: the Training Hub's
 * Exercise Library tab and the plan builder's library panel. Goal tags widen
 * the result between themselves; the equipment switch and the search narrow it.
 */
export function matchesExerciseFilters({
  exercise,
  searchQuery,
  activeFilters,
}: {
  exercise: Exercise;
  searchQuery: string;
  activeFilters: ExerciseFilter[];
}): boolean {
  return (
    matchesSearch(exercise, searchQuery) &&
    matchesTags(exercise, activeFilters) &&
    matchesEquipment(exercise, activeFilters)
  );
}
