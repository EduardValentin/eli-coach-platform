import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import {
  createDatabaseClient,
  createManagedDatabasePool,
  createPostgresFeatureFlagRepository,
} from "@eli-coach-platform/db";
import { createFeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";

let featureFlagService: FeatureFlagReader | null = null;

export function getFeatureFlagService(): FeatureFlagReader {
  if (featureFlagService) {
    return featureFlagService;
  }

  const environment = loadRuntimeEnvironment(process.env);

  if (!environment.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to read feature flags.");
  }

  const pool = createManagedDatabasePool({
    applicationName: `${environment.APP_NAME}-platform`,
    connectionString: environment.DATABASE_URL,
  });
  const database = createDatabaseClient(pool);
  const repository = createPostgresFeatureFlagRepository(database);

  featureFlagService = createFeatureFlagService(repository);

  return featureFlagService;
}
