import {
  checkInsApiRoutes,
  checkInsClientJoinRoutes,
  checkInsClientRoutes,
  checkInsCoachJoinRoutes,
  checkInsCoachRoutes,
} from "./check-ins/routes";
import {
  clientOnboardingApiRoutes,
  clientOnboardingClientRoutes,
  clientProfileApiRoutes,
  clientProfileClientRoutes,
} from "./client-profile/routes";
import {
  clientResourcesApiRoutes,
  clientResourcesClientRoutes,
} from "./client-resources/routes";
import { clientsApiRoutes, clientsClientRoutes } from "./clients/routes";
import { notificationsApiRoutes } from "./notifications/routes";

export const clientsRoutes = {
  api: [
    ...clientsApiRoutes,
    ...notificationsApiRoutes,
    ...clientOnboardingApiRoutes,
    ...clientProfileApiRoutes,
    ...clientResourcesApiRoutes,
    ...checkInsApiRoutes,
  ],
  clientPortal: [
    ...clientsClientRoutes,
    ...clientOnboardingClientRoutes,
    ...checkInsClientJoinRoutes,
  ],
  clientPortalShell: [
    ...checkInsClientRoutes,
    ...clientProfileClientRoutes,
    ...clientResourcesClientRoutes,
  ],
  coachPortal: checkInsCoachJoinRoutes,
  coachPortalShell: checkInsCoachRoutes,
};
