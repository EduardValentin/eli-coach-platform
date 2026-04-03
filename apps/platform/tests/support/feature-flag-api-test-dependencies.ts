import {
  createDatabaseClient,
  createManagedDatabasePool,
  PostgresFeatureFlagRepository,
} from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";

export type FeatureFlagApiTestDependencies = {
  close(): Promise<void>;
  featureFlagReader: FeatureFlagReader;
};

export function createFeatureFlagApiTestDependencies(
  applicationConnectionString: string,
): FeatureFlagApiTestDependencies {
  const databasePool = createManagedDatabasePool({
    applicationName: "feature-flag-integration-tests",
    connectionString: applicationConnectionString,
  });
  const databaseClient = createDatabaseClient(databasePool);
  const featureFlagRepository = new PostgresFeatureFlagRepository(databaseClient);

  return {
    close: () => databasePool.end(),
    featureFlagReader: new FeatureFlagService(featureFlagRepository),
  };
}
