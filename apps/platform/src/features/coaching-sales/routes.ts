import { relative } from "@react-router/dev/routes";

import { CLIENT_ENDED_ROUTE_SEGMENT } from "../clients/public/paths";

import {
  CHECKOUT_COMPLETE_ROUTE_SEGMENT,
  COACHING_SALES_API_PATHS,
  SELECT_BUNDLE_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

export const coachingSalesPublicRoutes = [
  route(
    SELECT_BUNDLE_ROUTE_SEGMENT,
    "./ui/public/select-bundle/select-bundle-page.tsx",
  ),
  route(
    CHECKOUT_COMPLETE_ROUTE_SEGMENT,
    "./ui/public/checkout-complete/checkout-complete-page.tsx",
  ),
];

export const coachingSalesClientRoutes = [
  route(CLIENT_ENDED_ROUTE_SEGMENT, "./ui/client/ended/ended-page.tsx"),
];

export const coachingSalesApiRoutes = [
  route(
    COACHING_SALES_API_PATHS.paymentLinks.slice(1),
    "./api/coach/payment-links.ts",
  ),
  route(
    COACHING_SALES_API_PATHS.bundlePage.slice(1),
    "./api/public/bundle-page.ts",
  ),
  route(
    COACHING_SALES_API_PATHS.checkouts.slice(1),
    "./api/public/checkouts.ts",
  ),
  route(
    COACHING_SALES_API_PATHS.subscriptionCancellation.slice(1),
    "./api/client/subscription-cancellation.ts",
  ),
  route(
    COACHING_SALES_API_PATHS.programStart.slice(1),
    "./api/client/program-start.ts",
  ),
  route(
    COACHING_SALES_API_PATHS.paymentMethodSession.slice(1),
    "./api/client/payment-method-session.ts",
  ),
];
