import { index, relative } from "@react-router/dev/routes";

import { SIGN_IN_FAILED_ROUTE_SEGMENT } from "../../bounded-contexts/access/accounts/public/paths";
import {
  assessmentCallsBookingRoutes,
  assessmentCallsJoinRoutes,
} from "../../bounded-contexts/scheduling/assessment-calls/routes";
import { INVITATION_ROUTE_SEGMENT } from "../../bounded-contexts/clients/clients/public/paths";
import { coachingSalesPublicRoutes } from "../../bounded-contexts/sales/coaching-sales/routes";
import { storePublicRoutes } from "../../bounded-contexts/sales/store/routes";

import { PRICING_PATH } from "./paths";

const { layout, route } = relative(import.meta.dirname);

export const publicSiteRoutes = [
  layout("./shell/layout.tsx", [
    index("./surfaces/public-site/pages/home.tsx"),
    route("blog", "./pages/blog.tsx"),
    route(PRICING_PATH.slice(1), "./pages/pricing.tsx"),
    route("privacy", "./pages/privacy.tsx"),
    route("terms", "./pages/terms.tsx"),
    ...assessmentCallsBookingRoutes,
    ...coachingSalesPublicRoutes,
    ...storePublicRoutes,
  ]),
  route(SIGN_IN_FAILED_ROUTE_SEGMENT, "./pages/sign-in-failed.tsx"),
  route(INVITATION_ROUTE_SEGMENT, "./pages/invitation.tsx"),
  ...assessmentCallsJoinRoutes,
];
