export type FeatureFlagName = string;

export type PersistedFeatureFlag = {
  id: number;
  name: FeatureFlagName;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface FeatureFlagRepository {
  findByName(name: FeatureFlagName): Promise<PersistedFeatureFlag | null>;
}

export interface FeatureFlagReader {
  getFlag(name: FeatureFlagName): Promise<boolean>;
}

class RepositoryFeatureFlagService implements FeatureFlagReader {
  constructor(private readonly repository: FeatureFlagRepository) {}

  async getFlag(name: FeatureFlagName): Promise<boolean> {
    const featureFlag = await this.repository.findByName(name);

    return featureFlag?.enabled ?? false;
  }
}

export const waitlistModeFeatureFlag = "WAITLIST_MODE";

export function createFeatureFlagService(repository: FeatureFlagRepository): FeatureFlagReader {
  return new RepositoryFeatureFlagService(repository);
}
