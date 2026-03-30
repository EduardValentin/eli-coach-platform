import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { healthStatusSchema, serviceMetadataSchema } from "@eli-coach-platform/contracts";
import { createDatabasePool } from "@eli-coach-platform/db";
import Fastify from "fastify";

const environment = loadRuntimeEnvironment(process.env);
const server = Fastify({
  logger: true,
});

const pool = environment.DATABASE_URL ? createDatabasePool(environment.DATABASE_URL) : null;

server.get("/readyz", async () => {
  return { status: "ok" };
});

server.get("/healthz", async (_, reply) => {
  if (pool) {
    await pool.query("select 1");
  }

  return reply.send(
    healthStatusSchema.parse({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
  );
});

server.get("/v1/meta", async () => {
  return serviceMetadataSchema.parse({
    appName: environment.APP_NAME,
    environment: environment.ENVIRONMENT,
    service: "api",
    version: process.env.GIT_SHA ?? "dev",
  });
});

server.get("/v1/events", async (_, reply) => {
  reply.raw.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  });

  reply.raw.write(`event: ready\ndata: ${JSON.stringify({ status: "ok" })}\n\n`);
  reply.raw.end();
});

const shutdownSignals = ["SIGINT", "SIGTERM"] as const;

for (const signal of shutdownSignals) {
  process.on(signal, async () => {
    await server.close();
    await pool?.end();
    process.exit(0);
  });
}

await server.listen({
  host: "0.0.0.0",
  port: environment.PORT,
});
