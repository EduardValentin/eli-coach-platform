import { index, prefix, relative } from "@react-router/dev/routes";

import { CLIENT_PORTAL_ROUTE_SEGMENT } from "../../features/accounts/public/paths";
import { checkInsClientJoinRoutes } from "../../features/check-ins/routes";
import { clientOnboardingClientRoutes } from "../../features/client-onboarding/routes";
import { clientProfileClientRoutes } from "../../features/client-profile/routes";
import { clientResourcesClientRoutes } from "../../features/client-resources/routes";
import {
  coachingSalesClientRoutes,
  coachingSalesClientShellRoutes,
} from "../../features/coaching-sales/routes";

const { layout, route } = relative(import.meta.dirname);

export const clientPortalRoutes = [
  ...prefix(CLIENT_PORTAL_ROUTE_SEGMENT, [
    layout("./shell/access-layout.tsx", [
      layout("./shell/layout.tsx", [
        index("./surfaces/client-portal/pages/home.tsx"),
        ...clientProfileClientRoutes,
        ...clientResourcesClientRoutes,
        ...coachingSalesClientShellRoutes,
      ]),
      ...coachingSalesClientRoutes,
      ...clientOnboardingClientRoutes,
      ...checkInsClientJoinRoutes,
    ]),
  ]),
  // Deploy healthchecks and PWA installs read these without a session, so
  // they sit outside the guarded "client" route rather than as its children
  // — nesting them there would run the portal's access-guard middleware first.
  route(
    `${CLIENT_PORTAL_ROUTE_SEGMENT}/manifest.webmanifest`,
    "./api/manifest.ts",
  ),
  route(`${CLIENT_PORTAL_ROUTE_SEGMENT}/sw.js`, "./api/sw.ts"),
  route(`${CLIENT_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
