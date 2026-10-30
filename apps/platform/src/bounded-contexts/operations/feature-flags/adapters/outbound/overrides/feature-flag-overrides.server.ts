import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { MiddlewareFunction } from "react-router";

import { FeatureFlagOverrideReaderAdapter } from "./feature-flag-override-reader-adapter.server";
import { createFeatureFlagOverrideMiddleware } from "./feature-flag-overrides-http.server";

export type FeatureFlagOverrides = {
  featureFlags: FeatureFlagReaderPort;
  middleware: MiddlewareFunction<Response>;
};

export function composeBrowserFeatureFlagOverrides(options: {
  appBasePath: string;
  featureFlags: FeatureFlagReaderPort;
}): FeatureFlagOverrides {
  return {
    featureFlags: new FeatureFlagOverrideReaderAdapter(options.featureFlags),
    middleware: createFeatureFlagOverrideMiddleware({
      appBasePath: options.appBasePath,
    }),
  };
}

export function composeWithoutFeatureFlagOverrides(
  featureFlags: FeatureFlagReaderPort,
): FeatureFlagOverrides {
  return {
    featureFlags,
    middleware: (_args, next) => next(),
  };
}
