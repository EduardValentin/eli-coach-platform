import type {
  FeatureFlagName,
  FeatureFlagReader,
  FeatureFlagRepository,
} from "./feature-flag-model";

export class FeatureFlagService implements FeatureFlagReader {
  constructor(private readonly repository: FeatureFlagRepository) {}

  async getFlag(name: FeatureFlagName): Promise<boolean> {
    const featureFlag = await this.repository.findByName(name);

    return featureFlag?.enabled ?? false;
  }
}
