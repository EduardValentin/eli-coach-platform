import { index, relative } from "@react-router/dev/routes";

import { CLIENT_PORTAL_ROUTE_SEGMENT } from "../../features/accounts/contracts/paths";

const { route } = relative(import.meta.dirname);

export const clientPortalRoutes = [
  route(CLIENT_PORTAL_ROUTE_SEGMENT, "./shell/layout.tsx", [
    index("./surfaces/client-portal/pages/home.tsx"),
  ]),
  // Deploy healthchecks and PWA installs read these without a session, so
  // they sit outside the guarded "client" route rather than as its children
  // — nesting them there would run the portal's access-guard middleware first.
  route(`${CLIENT_PORTAL_ROUTE_SEGMENT}/manifest.webmanifest`, "./api/manifest.ts"),
  route(`${CLIENT_PORTAL_ROUTE_SEGMENT}/sw.js`, "./api/sw.ts"),
  route(`${CLIENT_PORTAL_ROUTE_SEGMENT}/readyz`, "./api/readyz.ts"),
];
