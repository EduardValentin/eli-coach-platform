import type { FeatureFlag } from "./feature-flag";

export interface FeatureFlags {
  listAll(): Promise<FeatureFlag[]>;
}
