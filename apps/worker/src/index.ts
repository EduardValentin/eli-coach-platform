import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { createDatabasePool } from "@eli-coach-platform/db";

const environment = loadRuntimeEnvironment(process.env);
const pool = environment.DATABASE_URL ? createDatabasePool(environment.DATABASE_URL) : null;

const interval = setInterval(async () => {
  if (!pool) {
    console.info("worker heartbeat", {
      environment: environment.ENVIRONMENT,
      service: "worker",
    });
    return;
  }

  await pool.query("select 1");
  console.info("worker heartbeat", {
    environment: environment.ENVIRONMENT,
    service: "worker",
  });
}, 30000);

const shutdownSignals = ["SIGINT", "SIGTERM"] as const;

for (const signal of shutdownSignals) {
  process.on(signal, async () => {
    clearInterval(interval);
    await pool?.end();
    process.exit(0);
  });
}
