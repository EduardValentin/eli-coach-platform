import { index, relative } from "@react-router/dev/routes";

import { COACH_PORTAL_ROUTE_SEGMENT } from "../../features/accounts/public/paths";
import { COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT } from "../../features/assessment-calls/public/paths";
import {
  checkInsCoachJoinRoutes,
  checkInsCoachRoutes,
} from "../../features/check-ins/routes";
import { COACH_CLIENT_RESOURCES_ROUTE_SEGMENT } from "../../features/client-resources/public/paths";
import { coachScheduleCoachRoutes } from "../../features/coach-schedule/routes";
import { COACH_CLIENTS_ROUTE_SEGMENT } from "../../features/coaching-sales/public/paths";
import { coachingSalesCoachRoutes } from "../../features/coaching-sales/routes";

const { layout, route } = relative(import.meta.dirname);

export const coachPortalRoutes = [
  route(COACH_PORTAL_ROUTE_SEGMENT, "./shell/access-layout.tsx", [
    layout("./shell/layout.tsx", [
      index("./surfaces/coach-portal/pages/home.tsx"),
      route(
        COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT,
        "./pages/assessment-calls.tsx",
      ),
      ...coachScheduleCoachRoutes,
      ...coachingSalesCoachRoutes,
      ...checkInsCoachRoutes,
      route(`${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId`, "./pages/client.tsx"),
      route(
        COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
        "./pages/client-resources.tsx",
      ),
    ]),
    ...checkInsCoachJoinRoutes,
  ]),
  route(`${COACH_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
