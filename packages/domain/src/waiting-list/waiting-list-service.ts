import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type WaitingListLaunchMode = "waitlist" | "normal";

export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export function resolveWaitingListLaunchMode(
  featureFlags?: FeatureFlagSet | null,
): WaitingListLaunchMode {
  return featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === false ? "normal" : "waitlist";
}

export class WaitingListService {
  constructor(private readonly featureFlagReader: FeatureFlagReader) {}

  async getLaunchMode(): Promise<WaitingListLaunchMode> {
    try {
      return resolveWaitingListLaunchMode(await this.featureFlagReader.getFeatureFlags({}));
    } catch {
      return "waitlist";
    }
  }
}
