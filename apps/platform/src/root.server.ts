import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs, MiddlewareFunction } from "react-router";

import { createAccountResolutionMiddleware } from "~/features/accounts/server/account-resolution-middleware.server";
import {
  getPlatformContainer,
  type PlatformContainer,
} from "~/server/container.server";
import { createFeatureContextMiddleware } from "~/server/feature-contexts.server";

const nonProductionComposition = __FEATURE_FLAG_OVERRIDES_ENABLED__
  ? import("~/server/non-production/feature-flag-overrides-composition.server")
  : null;

const featureFlagOverrideMiddleware: MiddlewareFunction<Response> =
  nonProductionComposition
    ? async (args, next) =>
        (await nonProductionComposition).featureFlagOverrideMiddleware(
          args,
          next,
        )
    : (_args, next) => next();

const getRuntimePlatformContainer: () =>
  PlatformContainer | Promise<PlatformContainer> = nonProductionComposition
  ? async () =>
      (await nonProductionComposition).getFeatureFlagOverrideContainer()
  : getPlatformContainer;

export const middleware = [
  clerkMiddleware(),
  featureFlagOverrideMiddleware,
  createFeatureContextMiddleware(getRuntimePlatformContainer),
  createAccountResolutionMiddleware(),
];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
