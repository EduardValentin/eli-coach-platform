import { index, prefix, relative } from "@react-router/dev/routes";

import { CLIENT_PORTAL_ROUTE_SEGMENT } from "../../bounded-contexts/access/public/paths";
import { clientsRoutes } from "../../bounded-contexts/clients/routes";
import { CLIENT_SETTINGS_ROUTE_SEGMENT } from "../../bounded-contexts/sales/coaching-sales/public/paths";
import { salesRoutes } from "../../bounded-contexts/sales/routes";

const { layout, route } = relative(import.meta.dirname);

export const clientPortalRoutes = [
  ...prefix(CLIENT_PORTAL_ROUTE_SEGMENT, [
    layout("./shell/access-layout.tsx", [
      layout("./shell/layout.tsx", [
        index("./surfaces/client-portal/pages/home/home.tsx"),
        ...clientsRoutes.clientPortalShell,
        route(CLIENT_SETTINGS_ROUTE_SEGMENT, "./pages/settings/settings.tsx"),
      ]),
      ...clientsRoutes.clientPortal,
      ...salesRoutes.clientPortal,
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
