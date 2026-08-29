import {
  buildPostgresConnectionString,
  resolveRuntimeDatabaseConnection,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";
import { createDatabaseClient, createManagedDatabasePool, type DatabaseClient } from "@eli-coach-platform/db";
import type { Pool } from "pg";

export type PlatformDatabase = {
  /**
   * Opens the pool on first use, not at composition. The public site answers
   * from configuration alone — bot detection, the waitlist snapshot, the
   * legal pages — so an instance with no DATABASE_* configuration still
   * serves them, and only a route that genuinely reads or writes rows fails,
   * naming the missing configuration.
   */
  client: DatabaseClient;
  close(): Promise<void>;
};

type OpenDatabase = {
  client: DatabaseClient;
  pool: Pool;
};

type CreatePlatformDatabaseOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createPlatformDatabase(options: CreatePlatformDatabaseOptions): PlatformDatabase {
  let openDatabase: OpenDatabase | null = null;

  const open = (): OpenDatabase =>
    (openDatabase ??= openPool(options.runtimeEnvironment));

  return {
    client: createDeferredDatabaseClient(open),
    close: async () => {
      const closing = openDatabase;

      openDatabase = null;

      await closing?.pool.end();
    },
  };
}

function openPool(runtimeEnvironment: RuntimeEnvironment): OpenDatabase {
  const pool = createManagedDatabasePool({
    applicationName: runtimeEnvironment.APP_NAME,
    connectionString: buildPostgresConnectionString(
      resolveDatabaseConnection(runtimeEnvironment),
    ),
  });

  return {
    client: createDatabaseClient(pool),
    pool,
  };
}

// Callers that answer a read failure with "temporarily unavailable" — the
// Store catalog, the waitlist snapshot — would otherwise swallow a
// misconfigured deployment without a word in the log.
function resolveDatabaseConnection(runtimeEnvironment: RuntimeEnvironment) {
  try {
    return resolveRuntimeDatabaseConnection(runtimeEnvironment);
  } catch (error) {
    console.error("Database configuration is missing.", {
      errorCategory: "database_configuration_missing",
    });

    throw error;
  }
}

// Repositories keep taking a plain DatabaseClient: the deferral lives here, at
// the one place that owns the pool's lifecycle, rather than as a check every
// repository would have to repeat. Methods are bound to the real client so a
// query builder never carries the proxy as its `this`.
function createDeferredDatabaseClient(open: () => OpenDatabase): DatabaseClient {
  return new Proxy({} as DatabaseClient, {
    get(_target, property) {
      const client = open().client;
      const value = Reflect.get(client, property) as unknown;

      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
