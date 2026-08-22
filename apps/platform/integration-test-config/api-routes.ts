import type { RouteConfigEntry } from "@react-router/dev/routes";
import {
  createStaticHandler,
  matchRoutes,
  RouterContextProvider,
  type ActionFunction,
  type LoaderFunction,
  type MiddlewareFunction,
  type RouteObject,
} from "react-router";

import appRoutes from "~/routes";

type ServerRouteModule = {
  action?: ActionFunction;
  loader?: LoaderFunction;
  middleware?: MiddlewareFunction[];
};

type RegisteredRoute = {
  file: string;
  path: string;
};

/**
 * Named here, rather than derived from the route table alongside their paths,
 * because they must be imported after the containers exist: a server route
 * pulls in the composition root, and SDKs below it read their endpoint once,
 * at module scope.
 */
const SERVER_ROUTE_MODULES: Record<string, () => Promise<ServerRouteModule>> = {
  "./features/accounts/api/auth-complete.ts": () =>
    import("~/features/accounts/api/auth-complete"),
  "./features/accounts/api/auth-sign-in.ts": () =>
    import("~/features/accounts/api/auth-sign-in"),
  "./features/accounts/api/auth-sign-out.ts": () =>
    import("~/features/accounts/api/auth-sign-out"),
  "./features/accounts/api/session.ts": () =>
    import("~/features/accounts/api/session"),
  "./features/store/api/acquisitions.ts": () =>
    import("~/features/store/api/acquisitions"),
  "./features/store/api/catalog.ts": () => import("~/features/store/api/catalog"),
  "./features/store/api/covers.ts": () => import("~/features/store/api/covers"),
  "./features/store/api/downloads.ts": () =>
    import("~/features/store/api/downloads"),
  "./features/store/api/management-product-validations.ts": () =>
    import("~/features/store/api/management-product-validations"),
  "./features/store/api/management-products.ts": () =>
    import("~/features/store/api/management-products"),
  "./features/store/api/management-product.ts": () =>
    import("~/features/store/api/management-product"),
  "./features/store/api/management-product-versions.ts": () =>
    import("~/features/store/api/management-product-versions"),
  "./features/waitlist/api/waitlist.ts": () =>
    import("~/features/waitlist/api/waitlist"),
  "./server/api/bot-detection.ts": () => import("~/server/api/bot-detection"),
  "./server/api/feature-flags.ts": () => import("~/server/api/feature-flags"),
  "./server/api/meta.ts": () => import("~/server/api/meta"),
  "./server/api/readyz.ts": () => import("~/server/api/readyz"),
  // The portal layouts are `.tsx`, so the reachability check below cannot see
  // them, but they carry the authorization middleware and have to be driven
  // like any other entry point. `queryRoute` never renders, so mapping the
  // route file to its `.server` sibling — the module the `.tsx` re-exports —
  // gives the suite the real gate without pulling React in.
  "./surfaces/client-portal/shell/layout.tsx": () =>
    import("~/surfaces/client-portal/shell/layout.server"),
  "./surfaces/coach-portal/shell/layout.tsx": () =>
    import("~/surfaces/coach-portal/shell/layout.server"),
  "./surfaces/client-portal/api/manifest.ts": () =>
    import("~/surfaces/client-portal/api/manifest"),
  "./surfaces/client-portal/api/readyz.ts": () =>
    import("~/surfaces/client-portal/api/readyz"),
  "./surfaces/coach-portal/api/manifest.ts": () =>
    import("~/surfaces/coach-portal/api/manifest"),
  "./surfaces/coach-portal/api/readyz.ts": () =>
    import("~/surfaces/coach-portal/api/readyz"),
};

export type ApiRouteHandler = ReturnType<typeof createStaticHandler>;

export async function createApiRouteHandler(
  basePath: string,
): Promise<ApiRouteHandler> {
  const registeredRoutes = registerRoutes(appRoutes as RouteConfigEntry[]);

  assertEveryServerRouteIsReachable(registeredRoutes);

  const routes = await Promise.all(
    registeredRoutes
      .filter((route) => SERVER_ROUTE_MODULES[route.file])
      .map(async (route) => {
        const routeModule = await SERVER_ROUTE_MODULES[route.file]!();

        return {
          action: routeModule.action,
          id: route.file,
          loader: routeModule.loader,
          middleware: routeModule.middleware,
          path: route.path,
        };
      }),
  );

  return withRouteMiddleware({
    basePath,
    handler: createStaticHandler(routes, { basename: basePath }),
    routes,
  });
}

/**
 * `createStaticHandler` does not run route middleware — that belongs to the
 * framework server, which this harness is not. Route middleware is where the
 * portal guards live, so without this the suite would drive guarded routes and
 * see them wide open, passing for the wrong reason.
 *
 * This runs the matched routes' middleware in order and short-circuits on a
 * thrown `Response`, which is what the server pipeline does. It does not
 * reproduce `next()`, because nothing here uses it; a middleware that did would
 * need this extended rather than trusted.
 */
function withRouteMiddleware(options: {
  basePath: string;
  handler: ApiRouteHandler;
  routes: RouteObject[];
}): ApiRouteHandler {
  const runMiddleware = async (request: Request): Promise<Response | null> => {
    const matches =
      matchRoutes(options.routes, new URL(request.url).pathname, options.basePath) ??
      [];

    for (const match of matches) {
      for (const middleware of match.route.middleware ?? []) {
        try {
          await middleware(
            {
              context: new RouterContextProvider(),
              params: match.params,
              pattern: match.route.path ?? "",
              request,
              url: new URL(request.url),
            },
            async () => undefined,
          );
        } catch (thrown) {
          if (thrown instanceof Response) {
            return thrown;
          }

          throw thrown;
        }
      }
    }

    return null;
  };

  return {
    ...options.handler,
    query: async (request, opts) =>
      (await runMiddleware(request)) ?? options.handler.query(request, opts),
    queryRoute: async (request, opts) =>
      (await runMiddleware(request)) ?? options.handler.queryRoute(request, opts),
  };
}

function registerRoutes(
  routes: readonly RouteConfigEntry[],
  parentPath = "",
): RegisteredRoute[] {
  return routes.flatMap((route) => {
    const path = route.path
      ? [parentPath, route.path].filter(Boolean).join("/")
      : parentPath;

    return [
      { file: route.file, path },
      ...registerRoutes(route.children ?? [], path),
    ];
  });
}

function assertEveryServerRouteIsReachable(
  registeredRoutes: readonly RegisteredRoute[],
): void {
  const unreachable = registeredRoutes
    .filter((route) => route.file.endsWith(".ts"))
    .filter((route) => !SERVER_ROUTE_MODULES[route.file]);

  if (unreachable.length === 0) {
    return;
  }

  throw new Error(
    `Server routes are missing from the integration suite: ${unreachable
      .map((route) => route.file)
      .join(", ")}`,
  );
}
