import type { Exercise } from '../context/TrainingContext';

/** The goal tags a coach can assign to an exercise (PRD §6, Exercise data model). */
export const EXERCISE_TAGS = ['Strength', 'Hypertrophy', 'Recovery'] as const;

/**
 * The equipment condition, expressed as one switch rather than a pair of chips:
 * off places no constraint, on narrows to equipment-free exercises. PRD §6,
 * Exercise Library req 5 lists "Equipment" and "No equipment" as two filters;
 * an equipment-only view is deliberately not offered, since the complement of
 * the switch is the unfiltered library.
 */
export const NO_EQUIPMENT_FILTER = 'No Equipment';

export type ExerciseTag = (typeof EXERCISE_TAGS)[number];
export type ExerciseFilter = ExerciseTag | typeof NO_EQUIPMENT_FILTER;

/**
 * "None" is a marker meaning nothing is needed, so it never counts as equipment.
 * The modal's equipment chips do not offer it and no seeded exercise carries it,
 * so today it can only arrive with hand-authored data — it is handled because
 * the plan builder's original filter already special-cased it, and dropping that
 * would have left such an exercise hidden from the equipment-free view.
 *
 * "Bodyweight" does count — a coach who picks it has described how the exercise
 * is loaded, not that the exercise is equipment-free.
 */
function requiresEquipment(exercise: Exercise): boolean {
  return exercise.equipment.some(item => item !== 'None');
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

function matchesTags(exercise: Exercise, selectedTags: ExerciseTag[]): boolean {
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
    matchesTags(exercise, activeFilters.filter(isExerciseTag)) &&
    matchesEquipment(exercise, activeFilters)
  );
}
