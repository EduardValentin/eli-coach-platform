import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";
import { getPlatformContainer } from "~/server/container.server";
import { createFeatureContextMiddleware } from "~/server/feature-contexts.server";

const featureFlagOverrideMiddleware: MiddlewareFunction<Response> = (
  args,
  next,
) => getPlatformContainer().featureFlagOverrides.middleware(args, next);

export const middleware = [
  clerkMiddleware(),
  featureFlagOverrideMiddleware,
  createFeatureContextMiddleware(getPlatformContainer),
  createAccountResolutionMiddleware(),
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
