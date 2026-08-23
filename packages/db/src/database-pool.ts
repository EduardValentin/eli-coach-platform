import pg, { type Pool } from "pg";

const { Pool: PgPool } = pg;

type CreateDatabasePoolOptions = {
  applicationName: string;
  connectionString: string;
  maxConnections?: number;
};

const managedPools = new Set<Pool>();
let shutdownHooksRegistered = false;

function unregisterPool(pool: Pool) {
  managedPools.delete(pool);
}

async function closeManagedPools() {
  const pools = Array.from(managedPools);

  managedPools.clear();

  await Promise.allSettled(pools.map((pool) => pool.end()));
}

function registerShutdownHooks() {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;

  const handleShutdown = () => {
    void closeManagedPools();
  };

  process.once("SIGINT", handleShutdown);
  process.once("SIGTERM", handleShutdown);
  process.once("beforeExit", handleShutdown);
}

export function createManagedDatabasePool(options: CreateDatabasePoolOptions): Pool {
  const pool = new PgPool({
    application_name: options.applicationName,
    connectionString: options.connectionString,
    max: options.maxConnections ?? 10,
  });
  const originalEnd = pool.end.bind(pool) as Pool["end"];

  // An idle connection can be closed by the server rather than by us: a
  // restart, a failover, an administrator terminating the backend. `pg` reports
  // that on the pool, and a pool with no `error` listener turns it into an
  // uncaught exception that takes the whole process down — a database blip
  // would stop the server rather than the request it interrupted. The pool
  // recovers on its own, discarding that client and opening another on the next
  // checkout, so there is nothing to do here but say what happened.
  pool.on("error", (error) => {
    console.error("The database closed an idle connection.", {
      applicationName: options.applicationName,
      reason: error.message,
    });
  });

  managedPools.add(pool);
  registerShutdownHooks();

  pool.end = ((callback?: () => void) => {
    unregisterPool(pool);

    if (callback) {
      return originalEnd(callback);
    }

    return originalEnd();
  }) as Pool["end"];

  return pool;
}
