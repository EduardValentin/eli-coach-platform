import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { createDatabaseClient, createManagedDatabasePool, type DatabaseClient } from "@eli-coach-platform/db";
import type { Pool } from "pg";
import { getRuntimeEnvironment } from "./runtime-environment.server";

export type PlatformDatabase = {
  databaseClient: DatabaseClient;
  databasePool: Pool;
};

type CreatePlatformDatabaseOptions = {
  connectionString?: string;
  runtimeEnvironment: RuntimeEnvironment;
};

let platformDatabase: PlatformDatabase | null = null;

function getDatabaseApplicationName(runtimeEnvironment: RuntimeEnvironment): string {
  return runtimeEnvironment.APP_NAME;
}

export function createPlatformDatabase(options: CreatePlatformDatabaseOptions): PlatformDatabase {
  const connectionString = options.connectionString ?? options.runtimeEnvironment.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to read feature flags.");
  }

  const databasePool = createManagedDatabasePool({
    applicationName: getDatabaseApplicationName(options.runtimeEnvironment),
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
