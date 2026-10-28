import type { MiddlewareFunction } from "react-router";

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
  facades: ReturnType<typeof composeFeatureFlagsFeature>["facades"];
  middleware: MiddlewareFunction<Response>;
  overrideMiddleware: MiddlewareFunction<Response>;
};

export function composeOperations(
  handles: OperationsHandles,
): OperationsComposition {
  const featureFlags = composeFeatureFlagsFeature(handles);

  return {
    components: { featureFlags: featureFlags.feature },
    facades: featureFlags.facades,
    middleware: ({ context }, next) => {
      context.set(featureFlagsContext, featureFlags.feature);
      return next();
    },
    overrideMiddleware: featureFlags.middleware,
  };
}
