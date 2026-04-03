import type {
  FeatureFlagEvaluationContext,
  FeatureFlagReader,
  FeatureFlagRepository,
  FeatureFlagSet,
  PersistedFeatureFlag,
} from "./feature-flag-model";
import { supportedFeatureFlags } from "./feature-flag-model";

function resolveFeatureFlagSet(persistedFeatureFlags: PersistedFeatureFlag[]): FeatureFlagSet {
  const resolvedFeatureFlags = Object.fromEntries(
    supportedFeatureFlags.map((featureFlagName) => [featureFlagName, false]),
  ) as FeatureFlagSet;

  for (const persistedFeatureFlag of persistedFeatureFlags) {
    resolvedFeatureFlags[persistedFeatureFlag.name] = persistedFeatureFlag.enabled;
  }

  return resolvedFeatureFlags;
}

export class FeatureFlagService implements FeatureFlagReader {
  constructor(private readonly repository: FeatureFlagRepository) {}

  async getFeatureFlags(_context: FeatureFlagEvaluationContext): Promise<FeatureFlagSet> {
    const persistedFeatureFlags = await this.repository.listAll();

    return resolveFeatureFlagSet(persistedFeatureFlags);
  }
}
