import { redirect, type MiddlewareFunction } from "react-router";

import { clientPortalRedirect } from "~/bounded-contexts/clients/clients/public/client-journey";
import { clientPortalStandingContext } from "~/bounded-contexts/clients/public/request-context";
import { accessContext } from "~/bounded-contexts/access/public/session";

// Middleware, not a loader: React Router runs matched loaders in parallel, so
// only middleware stops every page below it from loading for a refused visitor.
export const middleware: MiddlewareFunction<Response>[] = [
  async (args, next) => {
    const access = args.context.get(accessContext);
    access.requirePortalAccess("CLIENT");
    const redirectTo = clientPortalRedirect({
      standing: args.context.get(clientPortalStandingContext),
      url: args.url,
      appBasePath: access.portal.appBasePath,
    });

    if (redirectTo) {
      throw redirect(redirectTo);
    }

    return next();
  },
];
