import { relative } from "@react-router/dev/routes";

import { STRIPE_WEBHOOKS_API_PATH } from "./public/paths";
import {
  subscriptionsApiRoutes,
  subscriptionsClientRoutes,
  subscriptionsPublicRoutes,
} from "./subscriptions/routes";
import { storeApiRoutes, storePublicRoutes } from "./store/routes";
import { waitlistApiRoutes } from "./waitlist/routes";

const { route } = relative(import.meta.dirname);

const paymentsApiRoutes = [
  route(
    STRIPE_WEBHOOKS_API_PATH.slice(1),
    "./shared/payments/adapters/inbound/http/stripe-webhooks.ts",
  ),
];

export const salesRoutes = {
  api: [
    ...subscriptionsApiRoutes,
    ...paymentsApiRoutes,
    ...waitlistApiRoutes,
    ...storeApiRoutes,
  ],
  clientPortal: subscriptionsClientRoutes,
  publicSiteShell: [...subscriptionsPublicRoutes, ...storePublicRoutes],
};
