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

// Thrown by any client access once close() has run. Without a named guard,
// the proxy below would just try to reopen a pool that's meant to be gone —
// hiding a real lifecycle bug (a request served after shutdown began, a
// repository reference that outlived its container) behind what looks like
// an ordinary, if slow, query.
export class DatabaseClosedError extends Error {
  constructor() {
    super("database client used after close");
    this.name = "DatabaseClosedError";
  }
}

export function createPlatformDatabase(options: CreatePlatformDatabaseOptions): PlatformDatabase {
  let openDatabase: OpenDatabase | null = null;
  let closed = false;
  // Missing DATABASE_* configuration fails the same way on every access
  // until the process restarts with real configuration — logging it again
  // on every request that touches the database would flood the log with
  // duplicates of the same one fact instead of naming the problem once.
  let hasLoggedMissingConfiguration = false;

  const open = (): OpenDatabase => {
    if (closed) {
      throw new DatabaseClosedError();
    }

    if (openDatabase) {
      return openDatabase;
    }

    try {
      openDatabase = openPool(options.runtimeEnvironment);
    } catch (error) {
      if (!hasLoggedMissingConfiguration) {
        // Callers that answer a read failure with "temporarily unavailable"
        // — the Store catalog, the waitlist snapshot — would otherwise
        // swallow a misconfigured deployment without a word in the log.
        console.error("Database configuration is missing.", {
          errorCategory: "database_configuration_missing",
        });
        hasLoggedMissingConfiguration = true;
      }

      throw error;
    }

    return openDatabase;
  };

  return {
    client: createDeferredDatabaseClient(open),
    close: async () => {
      const closing = openDatabase;

      openDatabase = null;
      closed = true;

      await closing?.pool.end();
    },
  };
}

function openPool(runtimeEnvironment: RuntimeEnvironment): OpenDatabase {
  const pool = createManagedDatabasePool({
    applicationName: runtimeEnvironment.APP_NAME,
    connectionString: buildPostgresConnectionString(
      resolveRuntimeDatabaseConnection(runtimeEnvironment),
    ),
  });

  return {
    client: createDatabaseClient(pool),
    pool,
  };
}

// Repositories keep taking a plain DatabaseClient: the deferral lives here, at
// the one place that owns the pool's lifecycle, rather than as a check every
// repository would have to repeat. Methods are bound to the real client so a
// query builder never carries the proxy as its `this`.
function createDeferredDatabaseClient(open: () => OpenDatabase): DatabaseClient {
  return new Proxy({} as DatabaseClient, {
    get(_target, property) {
      // Symbol keys (Symbol.toPrimitive, util.inspect's custom hook, ...)
      // and "then" get probed by the runtime and by anything doing a
      // thenable check (an accidental `await database.client`, a matcher
      // library inspecting the value) without the caller ever meaning to
      // run a query. Answering those without opening the pool keeps a stray
      // console.log or await from paying for — or failing on — a
      // connection nobody asked for.
      if (typeof property === "symbol" || property === "then") {
        return undefined;
      }

      const client = open().client;
      const value = Reflect.get(client, property) as unknown;

      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
