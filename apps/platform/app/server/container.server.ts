import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { getPlatformDatabase } from "./database.server";
import { getRuntimeEnvironment } from "./runtime-environment.server";

export type PlatformContainer = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagReader: FeatureFlagReader;
  runtimeEnvironment: RuntimeEnvironment;
};

let platformContainer: PlatformContainer | null = null;

export function getPlatformContainer(): PlatformContainer {
  if (platformContainer) {
    return platformContainer;
  }

  const runtimeEnvironment = getRuntimeEnvironment();
  const { databaseClient, databasePool } = getPlatformDatabase();
  const featureFlagRepository = new PostgresFeatureFlagRepository(databaseClient);

  platformContainer = {
    databaseClient,
    databasePool,
    featureFlagReader: new FeatureFlagService(featureFlagRepository),
    runtimeEnvironment,
  };

  return platformContainer;
}
