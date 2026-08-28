import type { RouteConfigEntry } from "@react-router/dev/routes";
import {
  createStaticHandler,
  isRouteErrorResponse,
  RouterContextProvider,
  type ActionFunction,
  type LoaderFunction,
  type RouteObject,
  type StaticHandler,
} from "react-router";

import appRoutes from "~/routes";

type ServerRouteModule = {
  action?: ActionFunction;
  loader?: LoaderFunction;
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
 *
 * A route registered as `layout.tsx` or `page.tsx` is entered through the
 * `.server` sibling it re-exports its loader from — the browser half never
 * runs on the server, and the loader is the whole of what an entry point does
 * before rendering.
 */
const SERVER_ROUTE_MODULES: Record<string, () => Promise<ServerRouteModule>> = {
  "./features/accounts/api/account.ts": () =>
    import("~/features/accounts/api/account"),
  "./features/accounts/api/clerk-webhooks.ts": () =>
    import("~/features/accounts/api/clerk-webhooks"),
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
  "./surfaces/client-portal/api/manifest.ts": () =>
    import("~/surfaces/client-portal/api/manifest"),
  "./surfaces/client-portal/api/readyz.ts": () =>
    import("~/surfaces/client-portal/api/readyz"),
  "./surfaces/client-portal/shell/layout.tsx": () =>
    import("~/surfaces/client-portal/shell/layout.server"),
  "./surfaces/coach-portal/api/manifest.ts": () =>
    import("~/surfaces/coach-portal/api/manifest"),
  "./surfaces/coach-portal/api/readyz.ts": () =>
    import("~/surfaces/coach-portal/api/readyz"),
  "./surfaces/coach-portal/shell/layout.tsx": () =>
    import("~/surfaces/coach-portal/shell/layout.server"),
};

const ROOT_ROUTE_ID = "root";

export type ApiRouteHandler = (request: Request) => Promise<Response>;

export async function createApiRouteHandler(
  basePath: string,
): Promise<ApiRouteHandler> {
  const registeredRoutes = registerRoutes(appRoutes as RouteConfigEntry[]);

  assertEveryServerRouteIsReachable(registeredRoutes);

  // Deferred for the same reason as SERVER_ROUTE_MODULES: root.tsx is where
  // the account-resolution middleware is composed onto Clerk's, and composing
  // it reaches the container.
  const { middleware } = await import("~/root");

  const routes = await Promise.all(
    registeredRoutes
      .filter((route) => SERVER_ROUTE_MODULES[route.file])
      .map(async (route) => {
        const routeModule = await SERVER_ROUTE_MODULES[route.file]!();

        return {
          action: routeModule.action,
          id: route.file,
          loader: routeModule.loader,
          path: route.path,
        };
      }),
  );

  // The routes hang off the root exactly as they do in the built application,
  // so a request runs root.tsx's middleware chain before any loader — the
  // chain that resolves the Clerk session into an account.
  //
  // React Router's own server handler assigns a route module's
  // `MiddlewareFunction<Response>[]` to the same field; `RouteObject` declares
  // it with the client's unspecified result type, and the two disagree only in
  // what `next()` is said to return.
  const staticHandler = createStaticHandler(
    [
      {
        children: routes,
        id: ROOT_ROUTE_ID,
        middleware: middleware as unknown as RouteObject["middleware"],
      },
    ],
    { basename: basePath },
  );

  return (request) => respond(staticHandler, request);
}

/**
 * Mirrors how React Router's own request handler answers a route: passing
 * `generateMiddlewareResponse` is what turns route middleware on, and a
 * `Response` thrown by a middleware or a loader — a redirect, a 403 — is the
 * answer rather than a failure.
 */
async function respond(
  staticHandler: StaticHandler,
  request: Request,
): Promise<Response> {
  try {
    return await staticHandler.queryRoute(request, {
      generateMiddlewareResponse: async (queryRoute) => {
        try {
          return await queryRoute(request);
        } catch (error) {
          return toResponseOrRethrow(error);
        }
      },
      requestContext: new RouterContextProvider(),
    });
  } catch (error) {
    return toResponseOrRethrow(error);
  }
}

function toResponseOrRethrow(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  if (isRouteErrorResponse(error)) {
    return Response.json(error.data, {
      status: error.status,
      statusText: error.statusText,
    });
  }

  throw error;
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
