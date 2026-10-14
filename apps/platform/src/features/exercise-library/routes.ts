import { relative } from "@react-router/dev/routes";

import { EXERCISE_LIBRARY_API_PATHS } from "./public/paths";

const { route } = relative(import.meta.dirname);

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
