import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { createAccountResolutionMiddleware } from "~/bounded-contexts/access/accounts/server/account-resolution-middleware.server";
import { getPlatformContainer } from "~/composition-root/container.server";
import { refuseCrossSiteMutations } from "~/composition-root/cross-site-requests.server";
import { createFeatureContextMiddleware } from "~/composition-root/feature-contexts.server";

const featureFlagOverrideMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => getPlatformContainer().featureFlagOverrides.middleware(args, next);

export const middleware = [
  refuseCrossSiteMutations,
  clerkMiddleware(),
  featureFlagOverrideMiddleware,
  createFeatureContextMiddleware(getPlatformContainer),
  createAccountResolutionMiddleware(),
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
