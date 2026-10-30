export interface FeatureFlagsFacade {
  isOn(flag: string): Promise<boolean>;
}
