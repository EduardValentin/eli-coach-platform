import {
  exerciseLibraryApiRoutes,
  exerciseLibraryCoachRoutes,
} from "./exercise-library/routes";
import {
  nutritionLibraryApiRoutes,
  nutritionLibraryCoachBuilderRoutes,
  nutritionLibraryCoachRoutes,
} from "./nutrition-library/routes";
import {
  trainingProgramsApiRoutes,
  trainingProgramsCoachSetupRoutes,
} from "./training-programs/routes";

export const programsRoutes = {
  api: [
    ...exerciseLibraryApiRoutes,
    ...nutritionLibraryApiRoutes,
    ...trainingProgramsApiRoutes,
  ],
  coachPortal: [
    ...nutritionLibraryCoachBuilderRoutes,
    ...trainingProgramsCoachSetupRoutes,
  ],
  coachPortalShell: [
    ...exerciseLibraryCoachRoutes,
    ...nutritionLibraryCoachRoutes,
  ],
};
