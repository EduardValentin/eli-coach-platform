import { index, relative } from "@react-router/dev/routes";

import { COACH_PORTAL_ROUTE_SEGMENT } from "../../bounded-contexts/access/public/paths";
import { COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT } from "../../bounded-contexts/scheduling/assessment-calls/public/paths";
import { clientsRoutes } from "../../bounded-contexts/clients/routes";
import { COACH_CLIENT_RESOURCES_ROUTE_SEGMENT } from "../../bounded-contexts/clients/client-resources/public/paths";
import {
  COACH_CLIENT_PROFILE_ROUTE_SEGMENT,
  COACH_CLIENTS_ROUTE_SEGMENT,
} from "../../bounded-contexts/clients/clients/public/paths";
import { programsRoutes } from "../../bounded-contexts/programs/routes";
import { schedulingRoutes } from "../../bounded-contexts/scheduling/routes";

const { layout, route } = relative(import.meta.dirname);

export const coachPortalRoutes = [
  route(COACH_PORTAL_ROUTE_SEGMENT, "./shell/access-layout.tsx", [
    layout("./shell/layout.tsx", [
      index("./surfaces/coach-portal/pages/home/home.tsx"),
      ...programsRoutes.coachPortalShell,
      route(
        COACH_ASSESSMENT_CALLS_ROUTE_SEGMENT,
        "./pages/assessment-calls/assessment-calls.tsx",
      ),
      ...schedulingRoutes.coachPortalShell,
      route(COACH_CLIENTS_ROUTE_SEGMENT, "./pages/clients/clients.tsx"),
      ...clientsRoutes.coachPortalShell,
      route(
        `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId`,
        "./pages/client/client.tsx",
      ),
      route(
        COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
        "./pages/client-resources/client-resources.tsx",
      ),
      route(
        COACH_CLIENT_PROFILE_ROUTE_SEGMENT,
        "./pages/client-profile/client-profile.tsx",
      ),
    ]),
    ...clientsRoutes.coachPortal,
    ...programsRoutes.coachPortal,
  ]),
  route(`${COACH_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
