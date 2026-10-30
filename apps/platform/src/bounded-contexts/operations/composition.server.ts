import type { MiddlewareFunction } from "react-router";

import { featureFlagsContext } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/context.server";
import { composeFeatureFlagsFeature } from "~/bounded-contexts/operations/feature-flags/composition.server";

type OperationsHandles = Parameters<typeof composeFeatureFlagsFeature>[0];

export type OperationsComposition = {
  facades: ReturnType<typeof composeFeatureFlagsFeature>["facades"];
  middleware: MiddlewareFunction<Response>;
  overrideMiddleware: MiddlewareFunction<Response>;
};

export function composeOperations(
  handles: OperationsHandles,
): OperationsComposition {
  const featureFlags = composeFeatureFlagsFeature(handles);

  return {
    facades: featureFlags.facades,
    middleware: ({ context }, next) => {
      context.set(featureFlagsContext, featureFlags.feature);
      return next();
    },
    overrideMiddleware: featureFlags.middleware,
  };
}
