import type { FeatureFlag } from "./feature-flag";

export interface FeatureFlagsPort {
  listAll(): Promise<FeatureFlag[]>;
}
