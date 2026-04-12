import {
  buildPostgresConnectionString,
  resolveRuntimeDatabaseConnection,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { createDatabaseClient, createManagedDatabasePool, type DatabaseClient } from "@eli-coach-platform/db";
import type { Pool } from "pg";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformDatabase = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
};

type CreatePlatformDatabaseOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

let platformDatabase: PlatformDatabase | null = null;

export function createPlatformDatabase(options: CreatePlatformDatabaseOptions): PlatformDatabase {
  const connectionString = buildPostgresConnectionString(
    resolveRuntimeDatabaseConnection(options.runtimeEnvironment),
  );

  const databasePool = createManagedDatabasePool({
    applicationName: options.runtimeEnvironment.APP_NAME,
    connectionString,
  });

  return {
    databaseClient: createDatabaseClient(databasePool),
    databasePool,
  };
}

export function getPlatformDatabase(): PlatformDatabase {
  if (platformDatabase) {
    return platformDatabase;
  }

  const runtimeEnvironment = getRuntimeEnvironment();

  platformDatabase = createPlatformDatabase({
    runtimeEnvironment,
  });

  return platformDatabase;
}
