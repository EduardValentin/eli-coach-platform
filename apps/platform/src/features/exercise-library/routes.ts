import { relative } from "@react-router/dev/routes";

import {
  COACH_TRAINING_ROUTE_SEGMENT,
  EXERCISE_EDITOR_ROUTE_SEGMENT,
  EXERCISE_LIBRARY_API_PATHS,
  NEW_EXERCISE_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

const EXERCISE_EDITOR_PAGE = "./ui/coach/exercises/exercise-editor-page.tsx";

export const exerciseLibraryCoachRoutes = [
  route(
    COACH_TRAINING_ROUTE_SEGMENT,
    "./ui/coach/exercises/exercise-library-page.tsx",
  ),
  route(NEW_EXERCISE_ROUTE_SEGMENT, EXERCISE_EDITOR_PAGE, {
    id: "features/exercise-library/new-exercise",
  }),
  route(EXERCISE_EDITOR_ROUTE_SEGMENT, EXERCISE_EDITOR_PAGE, {
    id: "features/exercise-library/edit-exercise",
  }),
];

export const exerciseLibraryApiRoutes = [
  route(
    EXERCISE_LIBRARY_API_PATHS.exercises.slice(1),
    "./api/exercises/exercises.ts",
  ),
  route(
    EXERCISE_LIBRARY_API_PATHS.exercise.slice(1),
    "./api/exercises/exercise.ts",
  ),
];
