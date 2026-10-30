import type { RouteConfig } from "@react-router/dev/routes";

import { accessRoutes } from "./bounded-contexts/access/routes";
import { clientsRoutes } from "./bounded-contexts/clients/routes";
import { operationsRoutes } from "./bounded-contexts/operations/routes";
import { programsRoutes } from "./bounded-contexts/programs/routes";
import { salesRoutes } from "./bounded-contexts/sales/routes";
import { schedulingRoutes } from "./bounded-contexts/scheduling/routes";
import { platformApiRoutes } from "./composition-root/api/routes";
import { clientPortalRoutes } from "./surfaces/client-portal/routes";
import { coachPortalRoutes } from "./surfaces/coach-portal/routes";
import { publicSiteRoutes } from "./surfaces/public-site/routes";

export default [
  ...publicSiteRoutes,
  ...platformApiRoutes,
  ...operationsRoutes.api,
  ...accessRoutes.api,
  ...programsRoutes.api,
  ...schedulingRoutes.api,
  ...clientsRoutes.api,
  ...salesRoutes.api,
  ...clientPortalRoutes,
  ...coachPortalRoutes,
] satisfies RouteConfig;
