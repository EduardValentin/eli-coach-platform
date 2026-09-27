import { index, relative } from "@react-router/dev/routes";

import { COACH_PORTAL_ROUTE_SEGMENT } from "../../features/accounts/contracts/paths";
import { COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT } from "../../features/assessment-calls/contracts/paths";
import { assessmentCallsCoachRoutes } from "../../features/assessment-calls/routes";

const { route } = relative(import.meta.dirname);

export const coachPortalRoutes = [
  route(COACH_PORTAL_ROUTE_SEGMENT, "./shell/layout.tsx", [
    index("./surfaces/coach-portal/pages/home.tsx"),
    route(COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT, "./pages/assessment-calls.tsx"),
    ...assessmentCallsCoachRoutes,
  ]),
  route(`${COACH_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
