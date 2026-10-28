import type { MiddlewareFunction } from "react-router";

import {
  exerciseLibraryContext,
  type ExerciseLibraryFeature,
} from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import {
  composeExerciseLibraryFeature,
  composeExerciseVideoFiles,
} from "~/bounded-contexts/programs/exercise-library/composition.server";
import type { ExerciseVideosConfig } from "~/bounded-contexts/programs/exercise-library/config.server";
import {
  nutritionLibraryContext,
  type NutritionLibraryFeature,
} from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import {
  composeNutritionLibraryFeature,
  composeRecipePhotoFiles,
} from "~/bounded-contexts/programs/nutrition-library/composition.server";
import type { RecipePhotosConfig } from "~/bounded-contexts/programs/nutrition-library/config.server";

type ProgramsHandles = Omit<
  Parameters<typeof composeExerciseLibraryFeature>[0] &
    Parameters<typeof composeNutritionLibraryFeature>[0],
  | keyof ReturnType<typeof composeExerciseVideoFiles>
  | keyof ReturnType<typeof composeRecipePhotoFiles>
> & {
  exerciseVideosConfig: ExerciseVideosConfig;
  recipePhotosConfig: RecipePhotosConfig;
};

export type ProgramsComposition = {
  components: {
    exerciseLibrary: ExerciseLibraryFeature;
    nutritionLibrary: NutritionLibraryFeature;
  };
  middleware: MiddlewareFunction<Response>;
};

export function composePrograms(handles: ProgramsHandles): ProgramsComposition {
  const exerciseLibrary = composeExerciseLibraryFeature({
    ...handles,
    ...composeExerciseVideoFiles(handles.exerciseVideosConfig),
  });
  const nutritionLibrary = composeNutritionLibraryFeature({
    ...handles,
    ...composeRecipePhotoFiles(handles.recipePhotosConfig),
  });

  return {
    components: { exerciseLibrary, nutritionLibrary },
    middleware: ({ context }, next) => {
      context.set(exerciseLibraryContext, exerciseLibrary);
      context.set(nutritionLibraryContext, nutritionLibrary);
      return next();
    },
  };
}
