import type { FeatureFlagReaderPort } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import type { MiddlewareFunction } from "react-router";

import { FeatureFlagOverrideReaderAdapter } from "./feature-flag-override-reader-adapter.server";
import { createFeatureFlagOverrideMiddleware } from "./feature-flag-overrides-http.server";

export type FeatureFlagOverrides = {
  featureFlagReaderPort: FeatureFlagReaderPort;
  middleware: MiddlewareFunction<Response>;
};

export function composeBrowserFeatureFlagOverrides(options: {
  appBasePath: string;
  featureFlagReaderPort: FeatureFlagReaderPort;
}): FeatureFlagOverrides {
  return {
    featureFlagReaderPort: new FeatureFlagOverrideReaderAdapter(
      options.featureFlagReaderPort,
    ),
    middleware: createFeatureFlagOverrideMiddleware({
      appBasePath: options.appBasePath,
    }),
  };
}

export function composeWithoutFeatureFlagOverrides(
  featureFlagReaderPort: FeatureFlagReaderPort,
): FeatureFlagOverrides {
  return {
    featureFlagReaderPort,
    middleware: (_args, next) => next(),
  };
}
