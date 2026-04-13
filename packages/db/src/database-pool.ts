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
