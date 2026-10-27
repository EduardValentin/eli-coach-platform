import { createContext, type RouterContext } from "react-router";

import type { ExerciseLibraryFeature } from "../exercise-library-composition.server";

export const exerciseLibraryContext: RouterContext<ExerciseLibraryFeature> =
  createContext<ExerciseLibraryFeature>();
