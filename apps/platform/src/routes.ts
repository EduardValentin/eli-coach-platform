import type { RouteConfig } from "@react-router/dev/routes";

import { accountsApiRoutes } from "./bounded-contexts/access/accounts/routes";
import { assessmentCallsApiRoutes } from "./bounded-contexts/scheduling/assessment-calls/routes";
import { checkInsApiRoutes } from "./bounded-contexts/clients/check-ins/routes";
import {
  clientOnboardingApiRoutes,
  clientProfileApiRoutes,
} from "./bounded-contexts/clients/client-profile/routes";
import { clientResourcesApiRoutes } from "./bounded-contexts/clients/client-resources/routes";
import { clientsApiRoutes } from "./bounded-contexts/clients/clients/routes";
import { coachScheduleApiRoutes } from "./bounded-contexts/scheduling/coach-schedule/routes";
import { coachingSalesApiRoutes } from "./bounded-contexts/sales/coaching-sales/routes";
import { exerciseLibraryApiRoutes } from "./bounded-contexts/programs/exercise-library/routes";
import { notificationsApiRoutes } from "./bounded-contexts/clients/notifications/routes";
import { nutritionLibraryApiRoutes } from "./bounded-contexts/programs/nutrition-library/routes";
import { storeApiRoutes } from "./bounded-contexts/sales/store/routes";
import { waitlistApiRoutes } from "./bounded-contexts/sales/waitlist/routes";
import { platformApiRoutes } from "./server/api/routes";
import { clientPortalRoutes } from "./surfaces/client-portal/routes";
import { coachPortalRoutes } from "./surfaces/coach-portal/routes";
import { publicSiteRoutes } from "./surfaces/public-site/routes";

export default [
  ...publicSiteRoutes,
  ...platformApiRoutes,
  ...accountsApiRoutes,
  ...exerciseLibraryApiRoutes,
  ...nutritionLibraryApiRoutes,
  ...coachScheduleApiRoutes,
  ...assessmentCallsApiRoutes,
  ...clientsApiRoutes,
  ...notificationsApiRoutes,
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
