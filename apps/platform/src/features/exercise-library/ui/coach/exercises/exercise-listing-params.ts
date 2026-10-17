import {
  DEFAULT_EXERCISE_SORT_KEY,
  EXERCISE_SORT_DEFAULT_DIRECTIONS,
  type ExerciseSortKey,
  type ExerciseStatus,
} from "@eli-coach-platform/domain/exercise";
import type { SortRule } from "@eli-coach-platform/ui/lib";

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
