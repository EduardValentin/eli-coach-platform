import type { RouteConfig } from "@react-router/dev/routes";

import { accountsApiRoutes } from "./features/accounts/routes";
import { assessmentCallsApiRoutes } from "./features/assessment-calls/routes";
import { storeApiRoutes } from "./features/store/routes";
import { waitlistApiRoutes } from "./features/waitlist/routes";
import { platformApiRoutes } from "./server/api/routes";
import { clientPortalRoutes } from "./surfaces/client-portal/routes";
import { coachPortalRoutes } from "./surfaces/coach-portal/routes";
import { publicSiteRoutes } from "./surfaces/public-site/routes";

export default [
  ...publicSiteRoutes,
  ...platformApiRoutes,
  ...accountsApiRoutes,
  ...assessmentCallsApiRoutes,
  ...waitlistApiRoutes,
  ...storeApiRoutes,
  ...clientPortalRoutes,
  ...coachPortalRoutes,
] satisfies RouteConfig;
