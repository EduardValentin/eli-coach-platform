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

export const waitlistModeFeatureFlag = "WAITLIST_MODE";
