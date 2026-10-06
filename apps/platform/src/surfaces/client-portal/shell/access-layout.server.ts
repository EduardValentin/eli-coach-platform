import type { MiddlewareFunction } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import { requireClientPortalStanding } from "~/features/coaching-sales/server/guards/require-client-portal-standing.server";

// Middleware, not a loader: React Router runs matched loaders in parallel, so
// only middleware stops every page below it from loading for a refused visitor.
export const middleware: MiddlewareFunction<Response>[] = [
  async (args, next) => {
    requirePortalAccess(args, { role: "CLIENT" });
    await requireClientPortalStanding(args);

    return next();
  },
];
