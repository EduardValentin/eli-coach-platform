import { createContext, type RouterContext } from "react-router";

import type { FeatureFlagController } from "~/bounded-contexts/operations/feature-flags/adapters/inbound/http/feature-flags-controller.server";

export type FeatureFlagsFeature = {
  featureFlags: FeatureFlagController;
};

export const featureFlagsContext: RouterContext<FeatureFlagsFeature> =
  createContext<FeatureFlagsFeature>();
