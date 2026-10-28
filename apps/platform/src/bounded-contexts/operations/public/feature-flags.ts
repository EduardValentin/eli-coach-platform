export const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export interface FeatureFlagsFacade {
  isOn(flag: string): Promise<boolean>;
}
