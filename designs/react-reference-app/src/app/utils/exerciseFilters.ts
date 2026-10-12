import type { Exercise } from '../context/TrainingContext';
import {
  countsFor,
  matchesQuery,
  orderBy,
  type SortRule,
} from './libraryListing';
import type { SortChoice } from '../components/SortControl';

export const EXERCISE_TAGS = ['Strength', 'Hypertrophy', 'Recovery'] as const;

export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

export const EXERCISE_TAG_LABELS: Record<ExerciseTag, string> = {
  Strength: 'Strength',
  Hypertrophy: 'Hypertrophy',
  Recovery: 'Recovery',
};

export type EquipmentFilter = 'any' | 'none';

export const EQUIPMENT_FILTERS: readonly EquipmentFilter[] = ['any', 'none'];

export const EQUIPMENT_LABELS: Record<EquipmentFilter, string> = {
  any: 'Any equipment',
  none: 'No equipment',
};

export type ExerciseSelection = {
  tags: readonly ExerciseTag[];
  equipment: EquipmentFilter;
  query: string;
};

export const NO_EXERCISE_FILTERS: ExerciseSelection = { tags: [], equipment: 'any', query: '' };

export type ExerciseSortKey = 'name' | 'difficulty';

export const EXERCISE_SORT: SortRule<ExerciseSortKey> = {
  fallback: 'name',
  defaultDirection: { name: 'asc', difficulty: 'asc' },
};

const DIFFICULTY_ORDER: Record<Exercise['difficulty'], number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

const BODYWEIGHT = 'Bodyweight';

function requiresEquipment(exercise: Exercise): boolean {
  return exercise.equipment.some((item) => item !== BODYWEIGHT);
}

function matchesTags(exercise: Exercise, tags: readonly ExerciseTag[]): boolean {
  if (tags.length === 0) return true;
  return tags.some((tag) => exercise.tags?.includes(tag));
}

function matchesEquipment(exercise: Exercise, equipment: EquipmentFilter): boolean {
  return equipment === 'any' || !requiresEquipment(exercise);
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  return matchesQuery([exercise.name, ...exercise.primaryMuscles], query);
}

export function matchesExerciseFilters(exercise: Exercise, selection: ExerciseSelection): boolean {
  return (
    matchesSearch(exercise, selection.query) &&
    matchesTags(exercise, selection.tags) &&
    matchesEquipment(exercise, selection.equipment)
  );
}

export function hasActiveExerciseFilters(selection: ExerciseSelection): boolean {
  return (
    selection.tags.length > 0 || selection.equipment !== 'any' || selection.query.trim().length > 0
  );
}

export function countsByTag(
  exercises: readonly Exercise[],
  selection: ExerciseSelection,
): Record<ExerciseTag, number> {
  const others = exercises.filter((exercise) =>
    matchesExerciseFilters(exercise, { ...selection, tags: [] }),
  );
  return countsFor(EXERCISE_TAGS, others, (exercise, tag) => matchesTags(exercise, [tag]));
}

export function countsByEquipment(
  exercises: readonly Exercise[],
  selection: ExerciseSelection,
): Record<EquipmentFilter, number> {
  const others = exercises.filter((exercise) =>
    matchesExerciseFilters(exercise, { ...selection, equipment: 'any' }),
  );
  return countsFor(EQUIPMENT_FILTERS, others, matchesEquipment);
}

export function parseEquipment(raw: string | null): EquipmentFilter {
  return raw === 'none' ? 'none' : 'any';
}

export function sortExercises(
  exercises: readonly Exercise[],
  sort: SortChoice<ExerciseSortKey>,
): Exercise[] {
  return orderBy(exercises, sort, {
    name: (one, other) => one.name.localeCompare(other.name),
    difficulty: (one, other) =>
      DIFFICULTY_ORDER[one.difficulty] - DIFFICULTY_ORDER[other.difficulty] ||
      one.name.localeCompare(other.name),
  });
}
