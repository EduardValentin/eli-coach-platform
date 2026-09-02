import {
  EXERCISE_TAGS,
  requiresEquipment,
  type ExerciseTag,
} from "@eli-coach-platform/domain";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

/** One switch: off places no constraint, on narrows to equipment-free exercises (PRD §6 req 5). */
export const NO_EQUIPMENT_FILTER = "No equipment";

export type ExerciseFilter = ExerciseTag | typeof NO_EQUIPMENT_FILTER;

type MatchOptions = {
  activeFilters: readonly ExerciseFilter[];
  exercise: ExerciseWire;
  searchQuery: string;
};

const isExerciseTag = (filter: ExerciseFilter): filter is ExerciseTag =>
  (EXERCISE_TAGS as readonly string[]).includes(filter);

/** Tags widen the result between themselves; the equipment switch and the search narrow it. */
export function matchesExerciseFilters(options: MatchOptions): boolean {
  const { activeFilters, exercise, searchQuery } = options;

  return (
    matchesSearch(exercise, searchQuery) &&
    matchesTags(exercise, activeFilters) &&
    matchesEquipment(exercise, activeFilters)
  );
}

export function toggleExerciseFilter(
  filters: readonly ExerciseFilter[],
  filter: ExerciseFilter,
): ExerciseFilter[] {
  return filters.includes(filter)
    ? filters.filter((active) => active !== filter)
    : [...filters, filter];
}

function matchesSearch(exercise: ExerciseWire, searchQuery: string): boolean {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return (
    exercise.name.toLowerCase().includes(query) ||
    exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(query))
  );
}

function matchesTags(
  exercise: ExerciseWire,
  activeFilters: readonly ExerciseFilter[],
): boolean {
  const selectedTags = activeFilters.filter(isExerciseTag);

  return (
    selectedTags.length === 0 ||
    selectedTags.some((tag) => exercise.tags.includes(tag))
  );
}

function matchesEquipment(
  exercise: ExerciseWire,
  activeFilters: readonly ExerciseFilter[],
): boolean {
  return (
    !activeFilters.includes(NO_EQUIPMENT_FILTER) ||
    !requiresEquipment(exercise.equipment)
  );
}
