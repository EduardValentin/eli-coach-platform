import { index, relative } from "@react-router/dev/routes";

import { COACH_PORTAL_ROUTE_SEGMENT } from "../../bounded-contexts/access/accounts/public/paths";
import { COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT } from "../../bounded-contexts/scheduling/assessment-calls/public/paths";
import {
  checkInsCoachJoinRoutes,
  checkInsCoachRoutes,
} from "../../bounded-contexts/clients/check-ins/routes";
import { COACH_CLIENT_RESOURCES_ROUTE_SEGMENT } from "../../bounded-contexts/clients/client-resources/public/paths";
import {
  COACH_CLIENT_PROFILE_ROUTE_SEGMENT,
  COACH_CLIENTS_ROUTE_SEGMENT,
} from "../../bounded-contexts/clients/clients/public/paths";
import { coachScheduleCoachRoutes } from "../../bounded-contexts/scheduling/coach-schedule/routes";
import { exerciseLibraryCoachRoutes } from "../../bounded-contexts/programs/exercise-library/routes";
import {
  nutritionLibraryCoachBuilderRoutes,
  nutritionLibraryCoachRoutes,
} from "../../bounded-contexts/programs/nutrition-library/routes";

const { layout, route } = relative(import.meta.dirname);

export const coachPortalRoutes = [
  route(COACH_PORTAL_ROUTE_SEGMENT, "./shell/access-layout.tsx", [
    layout("./shell/layout.tsx", [
      index("./surfaces/coach-portal/pages/home.tsx"),
      ...exerciseLibraryCoachRoutes,
      ...nutritionLibraryCoachRoutes,
      route(
        COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT,
        "./pages/assessment-calls.tsx",
      ),
      ...coachScheduleCoachRoutes,
      route(COACH_CLIENTS_ROUTE_SEGMENT, "./pages/clients.tsx"),
      ...checkInsCoachRoutes,
      route(`${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId`, "./pages/client.tsx"),
      route(
        COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
        "./pages/client-resources.tsx",
      ),
      route(COACH_CLIENT_PROFILE_ROUTE_SEGMENT, "./pages/client-profile.tsx"),
    ]),
    ...checkInsCoachJoinRoutes,
    ...nutritionLibraryCoachBuilderRoutes,
  ]),
  route(`${COACH_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
