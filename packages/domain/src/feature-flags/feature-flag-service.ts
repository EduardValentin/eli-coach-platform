import type {
  FeatureFlagEvaluationContext,
  FeatureFlagReader,
  FeatureFlags,
  FeatureFlagSet,
} from "./feature-flag-model";

export class FeatureFlagService implements FeatureFlagReader {
  constructor(private readonly repository: FeatureFlags) {}

  async getFeatureFlags(_context: FeatureFlagEvaluationContext): Promise<FeatureFlagSet> {
    const persistedFeatureFlags = await this.repository.listAll();

    return Object.fromEntries(
      persistedFeatureFlags.map((persistedFeatureFlag) => [
        persistedFeatureFlag.name,
        persistedFeatureFlag.enabled,
      ]),
    ) as FeatureFlagSet;
  }
}
