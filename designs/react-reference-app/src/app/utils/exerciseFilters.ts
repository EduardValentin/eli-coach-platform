import type { Exercise } from '../context/TrainingContext';
import {
  EXERCISE_TAGS,
  EXERCISE_TAG_LABELS,
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  needsEquipment,
  type ExerciseTag,
  type ExerciseType,
} from '../domain/exercises';
import { countsFor, matchesQuery, orderBy, type SortRule } from './libraryListing';
import type { SortChoice } from '../components/SortControl';

export { EXERCISE_TAGS, EXERCISE_TAG_LABELS, type ExerciseTag };

export type TypeFilter = 'any' | ExerciseType;
export const TYPE_FILTERS: readonly TypeFilter[] = ['any', ...EXERCISE_TYPES];
export const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
  any: 'Any type',
  ...EXERCISE_TYPE_LABELS,
};

export type EquipmentFilter = 'any' | 'none';
export const EQUIPMENT_FILTERS: readonly EquipmentFilter[] = ['any', 'none'];
export const EQUIPMENT_LABELS: Record<EquipmentFilter, string> = {
  any: 'Any equipment',
  none: 'No equipment',
};

export type ExerciseSelection = {
  type: TypeFilter;
  tags: readonly ExerciseTag[];
  equipment: EquipmentFilter;
  query: string;
};

export const NO_EXERCISE_FILTERS: ExerciseSelection = {
  type: 'any',
  tags: [],
  equipment: 'any',
  query: '',
};

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

function matchesType(exercise: Exercise, type: TypeFilter): boolean {
  return type === 'any' || exercise.type === type;
}

function matchesTags(exercise: Exercise, tags: readonly ExerciseTag[]): boolean {
  if (tags.length === 0) return true;
  return tags.some((tag) => exercise.tags.includes(tag));
}

function matchesEquipment(exercise: Exercise, equipment: EquipmentFilter): boolean {
  return equipment === 'any' || !needsEquipment(exercise.equipment);
}

function matchesSearch(exercise: Exercise, query: string): boolean {
  return matchesQuery([exercise.name, ...exercise.primaryMuscles], query);
}

export function matchesExerciseFilters(exercise: Exercise, selection: ExerciseSelection): boolean {
  return (
    matchesSearch(exercise, selection.query) &&
    matchesType(exercise, selection.type) &&
    matchesTags(exercise, selection.tags) &&
    matchesEquipment(exercise, selection.equipment)
  );
}

export function hasActiveExerciseFilters(selection: ExerciseSelection): boolean {
  return (
    selection.type !== 'any' ||
    selection.tags.length > 0 ||
    selection.equipment !== 'any' ||
    selection.query.trim().length > 0
  );
}

export function countsByType(
  exercises: readonly Exercise[],
  selection: ExerciseSelection,
): Record<TypeFilter, number> {
  const others = exercises.filter((exercise) =>
    matchesExerciseFilters(exercise, { ...selection, type: 'any' }),
  );
  return countsFor(TYPE_FILTERS, others, matchesType);
}

export function parseType(raw: string | null): TypeFilter {
  return (EXERCISE_TYPES as readonly string[]).includes(raw ?? '') ? (raw as ExerciseType) : 'any';
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
