import { index, relative } from "@react-router/dev/routes";

import { COACH_PORTAL_ROUTE_SEGMENT } from "../../features/accounts/public/paths";
import { COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT } from "../../features/assessment-calls/public/paths";
import { assessmentCallsCoachRoutes } from "../../features/assessment-calls/routes";
import { COACH_CLIENT_RESOURCES_ROUTE_SEGMENT } from "../../features/client-resources/public/paths";
import { COACH_CLIENTS_ROUTE_SEGMENT } from "../../features/coaching-sales/public/paths";
import { coachingSalesCoachRoutes } from "../../features/coaching-sales/routes";

const { route } = relative(import.meta.dirname);

export const coachPortalRoutes = [
  route(COACH_PORTAL_ROUTE_SEGMENT, "./shell/layout.tsx", [
    index("./surfaces/coach-portal/pages/home.tsx"),
    route(COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT, "./pages/assessment-calls.tsx"),
    ...assessmentCallsCoachRoutes,
    ...coachingSalesCoachRoutes,
    route(`${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId`, "./pages/client.tsx"),
    route(COACH_CLIENT_RESOURCES_ROUTE_SEGMENT, "./pages/client-resources.tsx"),
  ]),
  route(`${COACH_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
