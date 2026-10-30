import type { FeatureFlagSet } from "./feature-flag";

export interface FeatureFlagReaderPort {
  execute(): Promise<FeatureFlagSet>;
}
