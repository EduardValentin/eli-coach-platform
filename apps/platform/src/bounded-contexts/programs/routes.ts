import {
  exerciseLibraryApiRoutes,
  exerciseLibraryCoachRoutes,
} from "./exercise-library/routes";
import {
  nutritionLibraryApiRoutes,
  nutritionLibraryCoachBuilderRoutes,
  nutritionLibraryCoachRoutes,
} from "./nutrition-library/routes";
import { trainingProgramsCoachSetupRoutes } from "./training-programs/routes";

export const programsRoutes = {
  api: [...exerciseLibraryApiRoutes, ...nutritionLibraryApiRoutes],
  coachPortal: [
    ...nutritionLibraryCoachBuilderRoutes,
    ...trainingProgramsCoachSetupRoutes,
  ],
  coachPortalShell: [
    ...exerciseLibraryCoachRoutes,
    ...nutritionLibraryCoachRoutes,
  ],
};
