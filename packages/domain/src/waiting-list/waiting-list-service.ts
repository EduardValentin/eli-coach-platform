import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type Waitlist = {
  enabled: boolean;
  prospects: readonly unknown[];
};

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export class WaitingListService {
  constructor(private readonly featureFlagReader: FeatureFlagReader) {}

  async getWaitlist(): Promise<Waitlist> {
    try {
      const featureFlags = await this.featureFlagReader.getFeatureFlags({});

      return this.createWaitlist(featureFlags);
    } catch {
      return this.createWaitlist();
    }
  }

  private createWaitlist(featureFlags?: FeatureFlagSet | null): Waitlist {
    return {
      enabled: featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] !== false,
      prospects: [],
    };
  }
}
