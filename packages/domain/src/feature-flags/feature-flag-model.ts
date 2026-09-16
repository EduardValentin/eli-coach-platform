export type FeatureFlagName = string;
export type FeatureFlagEvaluationContext = {
  userId?: string;
};
export type FeatureFlagSet = Record<FeatureFlagName, boolean>;

export type PersistedFeatureFlag = {
  id: number;
  name: FeatureFlagName;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface FeatureFlags {
  listAll(): Promise<PersistedFeatureFlag[]>;
}

export interface FeatureFlagReader {
  getFeatureFlags(context: FeatureFlagEvaluationContext): Promise<FeatureFlagSet>;
}
