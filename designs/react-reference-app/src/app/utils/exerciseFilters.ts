import type { Exercise } from '../context/TrainingContext';

/** The goal tags a coach can assign to an exercise (PRD §6, Exercise data model). */
export const EXERCISE_TAGS = ['Strength', 'Hypertrophy', 'Recovery'] as const;

/** The two equipment choices from PRD §6, Exercise Library req 5. */
export const EQUIPMENT_FILTERS = ['Equipment', 'No Equipment'] as const;

export type ExerciseTag = (typeof EXERCISE_TAGS)[number];
export type EquipmentFilter = (typeof EQUIPMENT_FILTERS)[number];
export type ExerciseFilter = ExerciseTag | EquipmentFilter;

/**
 * "None" is a marker meaning the coach explicitly recorded that nothing is
 * needed, so it never counts as equipment. "Bodyweight" does count — a coach
 * who picks it has described how the exercise is loaded, not that the exercise
 * is equipment-free.
 */
export function requiresEquipment(exercise: Exercise): boolean {
  return exercise.equipment.some(item => item !== 'None');
}

const isExerciseTag = (filter: ExerciseFilter): filter is ExerciseTag =>
  (EXERCISE_TAGS as readonly string[]).includes(filter);

const isEquipmentFilter = (filter: ExerciseFilter): filter is EquipmentFilter =>
  (EQUIPMENT_FILTERS as readonly string[]).includes(filter);

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

function matchesEquipment(exercise: Exercise, selected: EquipmentFilter[]): boolean {
  if (selected.length === 0) return true;
  const needsEquipment = requiresEquipment(exercise);
  return selected.some(filter =>
    filter === 'Equipment' ? needsEquipment : !needsEquipment
  );
}

/**
 * The single rule behind both exercise-library surfaces: the Training Hub's
 * Exercise Library tab and the plan builder's library panel. Chips inside a
 * group widen the result; the groups and the search narrow it.
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
    matchesEquipment(exercise, activeFilters.filter(isEquipmentFilter))
  );
}
