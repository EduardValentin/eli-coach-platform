import {
  DEFAULT_EXERCISE_SORT_KEY,
  EXERCISE_SORT_DEFAULT_DIRECTIONS,
  type ExerciseSortKey,
  type ExerciseStatus,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { SortRule } from "~/shared/design-system/lib";

export const EXERCISE_FILTER_PARAMS = {
  type: "type",
  tags: "tags",
  equipment: "equipment",
  query: "q",
} as const;

export const EXERCISE_LISTING_PARAMS = {
  ...EXERCISE_FILTER_PARAMS,
  status: "status",
  sort: "sort",
  direction: "dir",
  page: "page",
} as const;

export const EXERCISE_SORT_RULE: SortRule<ExerciseSortKey> = {
  defaultDirection: EXERCISE_SORT_DEFAULT_DIRECTIONS,
  fallback: DEFAULT_EXERCISE_SORT_KEY,
};

export const EXERCISES_PER_PAGE = 10;

export const DEFAULT_EXERCISE_STATUS: ExerciseStatus = "active";

export function parseExerciseStatus(raw: string | null): ExerciseStatus {
  return raw === "archived" ? "archived" : DEFAULT_EXERCISE_STATUS;
}
