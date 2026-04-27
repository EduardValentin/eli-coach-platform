import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type WaitingListLaunchMode = "waitlist" | "normal";

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export class WaitingListService {
  constructor(private readonly featureFlagReader: FeatureFlagReader) {}

  async getLaunchMode(): Promise<WaitingListLaunchMode> {
    try {
      const featureFlags = await this.featureFlagReader.getFeatureFlags({});

      return this.resolveLaunchMode(featureFlags);
    } catch {
      return "waitlist";
    }
  }

  private resolveLaunchMode(featureFlags?: FeatureFlagSet | null): WaitingListLaunchMode {
    return featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === false ? "normal" : "waitlist";
  }
}
