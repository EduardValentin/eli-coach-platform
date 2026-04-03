import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { type PlatformDatabase, getPlatformDatabase } from "./database.server";
import { getRuntimeEnvironment } from "./runtime-environment.server";

export type PlatformContainer = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagReader: FeatureFlagReader;
  runtimeEnvironment: RuntimeEnvironment;
};

type CreatePlatformContainerOptions = {
  database: PlatformDatabase;
  runtimeEnvironment: RuntimeEnvironment;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const featureFlagRepository = new PostgresFeatureFlagRepository(options.database.databaseClient);

  return {
    databaseClient: options.database.databaseClient,
    databasePool: options.database.databasePool,
    featureFlagReader: new FeatureFlagService(featureFlagRepository),
    runtimeEnvironment: options.runtimeEnvironment,
  };
}

export function getPlatformContainer(): PlatformContainer {
  if (platformContainer) {
    return platformContainer;
  }

  const runtimeEnvironment = getRuntimeEnvironment();
  const database = getPlatformDatabase();

  platformContainer = createPlatformContainer({
    database,
    runtimeEnvironment,
  });

  return platformContainer;
}
