import {
  subscriptionsApiRoutes,
  subscriptionsClientRoutes,
  subscriptionsPublicRoutes,
} from "./subscriptions/routes";
import { storeApiRoutes, storePublicRoutes } from "./store/routes";
import { waitlistApiRoutes } from "./waitlist/routes";

export const salesRoutes = {
  api: [...subscriptionsApiRoutes, ...waitlistApiRoutes, ...storeApiRoutes],
  clientPortal: subscriptionsClientRoutes,
  publicSiteShell: [...subscriptionsPublicRoutes, ...storePublicRoutes],
};
