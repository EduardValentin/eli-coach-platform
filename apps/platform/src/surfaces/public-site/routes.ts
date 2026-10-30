import { index, relative } from "@react-router/dev/routes";

import {
  INVITATION_ROUTE_SEGMENT,
  SIGN_IN_FAILED_ROUTE_SEGMENT,
} from "../../bounded-contexts/access/public/paths";
import { legalRoutes } from "../../bounded-contexts/legal/routes";
import { salesRoutes } from "../../bounded-contexts/sales/routes";
import { schedulingRoutes } from "../../bounded-contexts/scheduling/routes";

import { PRICING_PATH } from "./paths";

const { layout, route } = relative(import.meta.dirname);

export const publicSiteRoutes = [
  layout("./shell/layout.tsx", [
    index("./surfaces/public-site/pages/home/home.tsx"),
    route("blog", "./pages/blog/blog.tsx"),
    route(PRICING_PATH.slice(1), "./pages/pricing/pricing.tsx"),
    ...legalRoutes.publicSiteShell,
    ...schedulingRoutes.publicSiteShell,
    ...salesRoutes.publicSiteShell,
  ]),
  route(
    SIGN_IN_FAILED_ROUTE_SEGMENT,
    "./pages/sign-in-failed/sign-in-failed.tsx",
  ),
  route(INVITATION_ROUTE_SEGMENT, "./pages/invitation/invitation.tsx"),
  ...schedulingRoutes.publicSite,
];
