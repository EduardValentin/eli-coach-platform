import type {
  FeatureFlagEvaluationContext,
  FeatureFlagReader,
  FeatureFlagRepository,
  FeatureFlagSet,
} from "./feature-flag-model";

export class FeatureFlagService implements FeatureFlagReader {
  constructor(private readonly repository: FeatureFlagRepository) {}

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
