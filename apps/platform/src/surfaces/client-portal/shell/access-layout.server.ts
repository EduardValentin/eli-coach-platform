import type { MiddlewareFunction } from "react-router";

import { requireClientPortalStanding } from "~/bounded-contexts/clients/clients/adapters/inbound/http/require-client-portal-standing.server";
import { accessContext } from "~/bounded-contexts/access/public/session";

// Middleware, not a loader: React Router runs matched loaders in parallel, so
// only middleware stops every page below it from loading for a refused visitor.
export const middleware: MiddlewareFunction<Response>[] = [
  async (args, next) => {
    args.context.get(accessContext).requirePortalAccess("CLIENT");
    await requireClientPortalStanding(args);

    return next();
  },
];
