import type { MiddlewareFunction } from "react-router";

import {
  exerciseLibraryContext,
  type ExerciseLibraryFeature,
} from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import { composeExerciseLibraryFeature } from "~/bounded-contexts/programs/exercise-library/composition.server";
import {
  nutritionLibraryContext,
  type NutritionLibraryFeature,
} from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import { composeNutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/composition.server";

export type ProgramsHandles = Parameters<
  typeof composeExerciseLibraryFeature
>[0] &
  Parameters<typeof composeNutritionLibraryFeature>[0];

export type ProgramsComposition = {
  components: {
    exerciseLibrary: ExerciseLibraryFeature;
    nutritionLibrary: NutritionLibraryFeature;
  };
  middleware: MiddlewareFunction<Response>;
};

export function composePrograms(handles: ProgramsHandles): ProgramsComposition {
  const exerciseLibrary = composeExerciseLibraryFeature(handles);
  const nutritionLibrary = composeNutritionLibraryFeature(handles);

  return {
    components: { exerciseLibrary, nutritionLibrary },
    middleware: ({ context }, next) => {
      context.set(exerciseLibraryContext, exerciseLibrary);
      context.set(nutritionLibraryContext, nutritionLibrary);
      return next();
    },
  };
}
