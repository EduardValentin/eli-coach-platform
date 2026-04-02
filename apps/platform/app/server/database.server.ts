import { createDatabaseClient, createManagedDatabasePool, type DatabaseClient } from "@eli-coach-platform/db";
import type { Pool } from "pg";
import { getRuntimeEnvironment } from "./runtime-environment.server";

type PlatformDatabase = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
};

let platformDatabase: PlatformDatabase | null = null;

export function getPlatformDatabase(): PlatformDatabase {
  if (platformDatabase) {
    return platformDatabase;
  }

  const runtimeEnvironment = getRuntimeEnvironment();

  if (!runtimeEnvironment.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to read feature flags.");
  }

  const databasePool = createManagedDatabasePool({
    applicationName: `${runtimeEnvironment.APP_NAME}-platform`,
    connectionString: runtimeEnvironment.DATABASE_URL,
  });

  platformDatabase = {
    databaseClient: createDatabaseClient(databasePool),
    databasePool,
  };

  return platformDatabase;
}
