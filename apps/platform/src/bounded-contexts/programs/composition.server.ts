import type { MiddlewareFunction } from "react-router";

import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";
import {
  composeCardioExercises,
  composeExerciseLibraryFeature,
  composeExerciseVideoFiles,
} from "~/bounded-contexts/programs/exercise-library/composition.server";
import type { ExerciseVideosConfig } from "~/bounded-contexts/programs/exercise-library/config.server";
import { nutritionLibraryContext } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import {
  composeNutritionLibraryFeature,
  composeRecipePhotoFiles,
} from "~/bounded-contexts/programs/nutrition-library/composition.server";
import type { RecipePhotosConfig } from "~/bounded-contexts/programs/nutrition-library/config.server";
import { trainingProgramsContext } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";
import { composeTrainingProgramsFeature } from "~/bounded-contexts/programs/training-programs/composition.server";
import type { ClientCoachingFacade } from "~/bounded-contexts/clients/public/client-coaching-facade";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";
import type { CoachingEndedFacade } from "~/bounded-contexts/sales/public/coaching-ended-facade";

type ProgramsHandles = Omit<
  Parameters<typeof composeExerciseLibraryFeature>[0] &
    Parameters<typeof composeNutritionLibraryFeature>[0],
  | keyof ReturnType<typeof composeExerciseVideoFiles>
  | keyof ReturnType<typeof composeRecipePhotoFiles>
> & {
  clientCoachingFacade: ClientCoachingFacade;
  clientLookupFacade: Pick<ClientLookupFacade, "identityOf">;
  coachingEndedFacade: CoachingEndedFacade;
  exerciseVideosConfig: ExerciseVideosConfig;
  recipePhotosConfig: RecipePhotosConfig;
};

export type ProgramsComposition = {
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
  const trainingPrograms = composeTrainingProgramsFeature({
    ...handles,
    ...composeCardioExercises({ database: handles.database }).handles,
  });

  return {
    middleware: ({ context }, next) => {
      context.set(exerciseLibraryContext, exerciseLibrary);
      context.set(nutritionLibraryContext, nutritionLibrary);
      context.set(trainingProgramsContext, trainingPrograms);
      return next();
    },
  };
}
