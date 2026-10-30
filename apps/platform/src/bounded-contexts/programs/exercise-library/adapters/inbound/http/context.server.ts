import { createContext, type RouterContext } from "react-router";

import type { ExerciseLibraryController } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/coach/exercise-library-controller.server";

export type ExerciseLibraryFeature = {
  exerciseLibraryController: ExerciseLibraryController;
};

export const exerciseLibraryContext: RouterContext<ExerciseLibraryFeature> =
  createContext<ExerciseLibraryFeature>();
