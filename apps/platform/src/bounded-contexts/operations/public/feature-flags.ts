export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export type FeatureFlagSetDto = Record<string, boolean>;

export interface FeatureFlagsFacade {
  read(): Promise<FeatureFlagSetDto>;
}
