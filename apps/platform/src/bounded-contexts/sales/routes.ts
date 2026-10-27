import {
  coachingSalesApiRoutes,
  coachingSalesClientRoutes,
  coachingSalesPublicRoutes,
} from "./coaching-sales/routes";
import { storeApiRoutes, storePublicRoutes } from "./store/routes";
import { waitlistApiRoutes } from "./waitlist/routes";

export const salesRoutes = {
  api: [...coachingSalesApiRoutes, ...waitlistApiRoutes, ...storeApiRoutes],
  clientPortal: coachingSalesClientRoutes,
  publicSiteShell: [...coachingSalesPublicRoutes, ...storePublicRoutes],
};
