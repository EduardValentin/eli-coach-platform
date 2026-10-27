import {
  exerciseLibraryApiRoutes,
  exerciseLibraryCoachRoutes,
} from "./exercise-library/routes";
import {
  nutritionLibraryApiRoutes,
  nutritionLibraryCoachBuilderRoutes,
  nutritionLibraryCoachRoutes,
} from "./nutrition-library/routes";

export const programsRoutes = {
  api: [...exerciseLibraryApiRoutes, ...nutritionLibraryApiRoutes],
  coachPortal: nutritionLibraryCoachBuilderRoutes,
  coachPortalShell: [
    ...exerciseLibraryCoachRoutes,
    ...nutritionLibraryCoachRoutes,
  ],
};
