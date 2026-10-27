import type { MiddlewareFunction } from "react-router";

import type { FeatureFlagReader } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import {
  featureFlagsContext,
  type FeatureFlagsFeature,
} from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import { composeFeatureFlagsFeature } from "~/bounded-contexts/operations/feature-flags/composition.server";

export type OperationsHandles = Parameters<
  typeof composeFeatureFlagsFeature
>[0];

export type OperationsComposition = {
  components: { featureFlags: FeatureFlagsFeature };
  middleware: MiddlewareFunction<Response>;
  overrideMiddleware: MiddlewareFunction<Response>;
  reader: FeatureFlagReader;
};

export function composeOperations(
  handles: OperationsHandles,
): OperationsComposition {
  const featureFlags = composeFeatureFlagsFeature(handles);

  return {
    components: { featureFlags: featureFlags.feature },
    middleware: ({ context }, next) => {
      context.set(featureFlagsContext, featureFlags.feature);
      return next();
    },
    overrideMiddleware: featureFlags.middleware,
    reader: featureFlags.reader,
  };
}
