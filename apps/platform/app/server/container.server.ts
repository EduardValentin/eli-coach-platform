import { FeatureFlagController } from "~/modules/feature-flags/feature-flag-controller.server";
import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { type PlatformDatabase, getPlatformDatabase } from "~/server/database.server";

export type PlatformContainer = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagController: FeatureFlagController;
  featureFlagService: FeatureFlagReader;
};

type CreatePlatformContainerOptions = {
  database: PlatformDatabase;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const featureFlagRepository = new PostgresFeatureFlagRepository(options.database.databaseClient);
  const featureFlagService = new FeatureFlagService(featureFlagRepository);

  return {
    databaseClient: options.database.databaseClient,
    databasePool: options.database.databasePool,
    featureFlagController: new FeatureFlagController(featureFlagService),
    featureFlagService,
  };
}

export function getPlatformContainer(): PlatformContainer {
  if (platformContainer) {
    return platformContainer;
  }

  platformContainer = createPlatformContainer({
    database: getPlatformDatabase(),
  });

  return platformContainer;
}
