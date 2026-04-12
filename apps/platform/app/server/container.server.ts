import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { type PlatformDatabase, getPlatformDatabase } from "~/server/database.server";

export type PlatformContainer = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagService: FeatureFlagReader;
};

type CreatePlatformContainerOptions = {
  database: PlatformDatabase;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const featureFlagRepository = new PostgresFeatureFlagRepository(options.database.databaseClient);

  return {
    databaseClient: options.database.databaseClient,
    databasePool: options.database.databasePool,
    featureFlagService: new FeatureFlagService(featureFlagRepository),
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
