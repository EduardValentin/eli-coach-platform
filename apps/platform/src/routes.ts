import type { RouteConfig } from "@react-router/dev/routes";

import { accountsApiRoutes } from "./features/accounts/routes";
import { assessmentCallsApiRoutes } from "./features/assessment-calls/routes";
import { checkInsApiRoutes } from "./features/check-ins/routes";
import { clientOnboardingApiRoutes } from "./features/client-onboarding/routes";
import { clientProfileApiRoutes } from "./features/client-profile/routes";
import { clientResourcesApiRoutes } from "./features/client-resources/routes";
import { coachScheduleApiRoutes } from "./features/coach-schedule/routes";
import { coachingSalesApiRoutes } from "./features/coaching-sales/routes";
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
  ...coachScheduleApiRoutes,
  ...assessmentCallsApiRoutes,
  ...coachingSalesApiRoutes,
  ...clientOnboardingApiRoutes,
  ...clientProfileApiRoutes,
  ...clientResourcesApiRoutes,
  ...checkInsApiRoutes,
  ...waitlistApiRoutes,
  ...storeApiRoutes,
  ...clientPortalRoutes,
  ...coachPortalRoutes,
] satisfies RouteConfig;
