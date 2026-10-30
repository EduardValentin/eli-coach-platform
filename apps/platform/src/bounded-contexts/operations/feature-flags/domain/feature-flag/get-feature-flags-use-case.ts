import { FeatureFlag, type FeatureFlagSet } from "./feature-flag";
import type { FeatureFlagReaderPort } from "./feature-flag-reader-port";
import type { FeatureFlagsPort } from "./feature-flags-port";

export class GetFeatureFlagsUseCase implements FeatureFlagReaderPort {
  constructor(private readonly options: { featureFlags: FeatureFlagsPort }) {}

  async execute(): Promise<FeatureFlagSet> {
    return FeatureFlag.toSet(await this.options.featureFlags.listAll());
  }
}
