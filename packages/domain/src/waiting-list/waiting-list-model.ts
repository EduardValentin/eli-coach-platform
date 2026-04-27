import type { FeatureFlagSet } from "../feature-flags";

export type WaitingListLaunchMode = "waitlist" | "normal";

export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export function resolveWaitingListLaunchMode(
  featureFlags?: FeatureFlagSet | null,
): WaitingListLaunchMode {
  return featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === false ? "normal" : "waitlist";
}
