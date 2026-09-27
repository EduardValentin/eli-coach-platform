import { relative } from "@react-router/dev/routes";

import {
  CHECKOUT_COMPLETE_ROUTE_SEGMENT,
  COACHING_SALES_API_PATHS,
  INVITATION_ROUTE_SEGMENT,
  SELECT_BUNDLE_ROUTE_SEGMENT,
} from "./contracts/paths";

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

export const coachingSalesInvitationRoutes = [
  route(INVITATION_ROUTE_SEGMENT, "./ui/public/invitation/invitation-page.tsx"),
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
    COACHING_SALES_API_PATHS.invitation.slice(1),
    "./api/public/invitation.ts",
  ),
];
