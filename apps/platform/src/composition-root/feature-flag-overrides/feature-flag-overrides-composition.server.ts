import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { MiddlewareFunction } from "react-router";

import { createFeatureFlagOverrideReader } from "./feature-flag-override-reader.server";
import { createFeatureFlagOverrideMiddleware } from "./feature-flag-overrides-http.server";

export type FeatureFlagOverrides = {
  featureFlags: FeatureFlagReader;
  middleware: MiddlewareFunction<Response>;
};

export function composeBrowserFeatureFlagOverrides(options: {
  appBasePath: string;
  featureFlags: FeatureFlagReader;
}): FeatureFlagOverrides {
  return {
    featureFlags: createFeatureFlagOverrideReader(options.featureFlags),
    middleware: createFeatureFlagOverrideMiddleware({
      appBasePath: options.appBasePath,
    }),
  };
}

export function composeWithoutFeatureFlagOverrides(
  featureFlags: FeatureFlagReader,
): FeatureFlagOverrides {
  return {
    featureFlags,
    middleware: (_args, next) => next(),
  };
}
