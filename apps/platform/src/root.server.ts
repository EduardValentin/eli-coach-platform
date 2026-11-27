import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { getPlatformContainer } from "~/composition-root/container.server";
import { refuseCrossSiteMutations } from "~/composition-root/cross-site-requests.server";
import { createBoundedContextMiddleware } from "~/composition-root/bounded-context-middleware.server";

const comingSoonNoIndexMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => getPlatformContainer().platform.comingSoonGate.noIndex(args, next);

const comingSoonBlockMiddleware: MiddlewareFunction<Response> = (args, next) =>
  getPlatformContainer().platform.comingSoonGate.blockUnlessOpen(args, next);

const featureFlagOverrideMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => getPlatformContainer().operations.overrideMiddleware(args, next);

const sessionMiddleware: MiddlewareFunction<Response> = (args, next) =>
  getPlatformContainer().access.sessionMiddleware(args, next);

const clientPortalStandingMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => getPlatformContainer().clients.portalStandingMiddleware(args, next);

export const middleware = [
  comingSoonNoIndexMiddleware,
  comingSoonBlockMiddleware,
  refuseCrossSiteMutations,
  clerkMiddleware(),
  featureFlagOverrideMiddleware,
  createBoundedContextMiddleware(getPlatformContainer),
  sessionMiddleware,
  clientPortalStandingMiddleware,
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
