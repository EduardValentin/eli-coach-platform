import { FeatureFlag, type FeatureFlagSet } from "./feature-flag";
import type { FeatureFlags } from "./feature-flags";

export interface FeatureFlagReader {
  execute(): Promise<FeatureFlagSet>;
}

export class GetFeatureFlagsUseCase implements FeatureFlagReader {
  constructor(private readonly options: { featureFlags: FeatureFlags }) {}

  async execute(): Promise<FeatureFlagSet> {
    return FeatureFlag.toSet(await this.options.featureFlags.listAll());
  }
}
