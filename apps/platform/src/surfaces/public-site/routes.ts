import { index, relative } from "@react-router/dev/routes";

import { accountsDeadEndRoutes } from "../../features/accounts/routes";
import {
  assessmentCallsBookingRoutes,
  assessmentCallsJoinRoutes,
} from "../../features/assessment-calls/routes";
import { coachingSalesPublicRoutes } from "../../features/coaching-sales/routes";
import { storePublicRoutes } from "../../features/store/routes";

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
  ...accountsDeadEndRoutes,
  ...assessmentCallsJoinRoutes,
];
