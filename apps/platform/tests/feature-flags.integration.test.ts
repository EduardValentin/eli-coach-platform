import { featureFlagSnapshotSchema } from "@eli-coach-platform/contracts";
import type { PlatformContainer } from "../app/server/container.server";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { handleFeatureFlagsRequest } from "../app/modules/feature-flags/feature-flag-api.server";
import { createPlatformContainer } from "../app/server/container.server";
import { createPlatformDatabase } from "../app/server/database.server";
import { loadIntegrationTestEnvironment } from "./support/integration-test-environment";
import { PostgresTestEnvironment } from "./support/postgres-test-environment";

const integrationTestEnvironment = loadIntegrationTestEnvironment();
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../../..");
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");
const migrationsDirectoryPath = resolve(rootDirectory, "packages/db/drizzle");
const seedDirectoryPath = resolve(rootDirectory, "packages/db/seeds");
const databaseEnvironment = new PostgresTestEnvironment({
  appName: integrationTestEnvironment.runtimeEnvironment.APP_NAME,
  applicationUser: integrationTestEnvironment.applicationUser,
  bootstrapSqlPath,
  databaseName: integrationTestEnvironment.databaseName,
  migrationUser: integrationTestEnvironment.migrationUser,
  migrationsDirectoryPath,
  schemaName: integrationTestEnvironment.schemaName,
});

function createFeatureFlagsRequest(body?: unknown): Request {
  return new Request("http://localhost/api/feature-flags", {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
    method: "POST",
  });
}

function createIntegrationTestPlatformContainer(): PlatformContainer {
  const runtimeEnvironment = integrationTestEnvironment.withDatabaseUrl(
    databaseEnvironment.getApplicationConnectionString(),
  );
  const database = createPlatformDatabase({
    connectionString: databaseEnvironment.getApplicationConnectionString(),
    runtimeEnvironment,
  });

  return createPlatformContainer({
    database,
    runtimeEnvironment,
  });
}

function getPlatformContainer(platformContainer: PlatformContainer | null): PlatformContainer {
  if (!platformContainer) {
    throw new Error("Platform container has not been created.");
  }

  return platformContainer;
}

describe.sequential("feature flag API integration", () => {
  let platformContainer: PlatformContainer | null = null;

  beforeAll(async () => {
    await databaseEnvironment.start();
    await databaseEnvironment.applySqlFiles(seedDirectoryPath);
    await databaseEnvironment.createSnapshot();
  }, 120000);

  beforeEach(() => {
    platformContainer = createIntegrationTestPlatformContainer();
  });

  afterEach(async () => {
    if (platformContainer) {
      await platformContainer.databasePool.end();
      platformContainer = null;
    }

    await databaseEnvironment.restoreSnapshot();
  });

  afterAll(async () => {
    await databaseEnvironment.stop();
  });

  it("returns the seeded feature flag snapshot and preserves the stored database row", async () => {
    const response = await handleFeatureFlagsRequest(
      createFeatureFlagsRequest({
        context: {
          userId: "user-123",
        },
      }),
      getPlatformContainer(platformContainer),
    );
    const body = featureFlagSnapshotSchema.parse(await response.json());
    const rowCount = await databaseEnvironment.countRows({
      tableName: "app.feature_flags",
      values: ["WAITLIST_MODE"],
      whereClause: "name = $1",
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        WAITLIST_MODE: true,
      },
    });
    expect(rowCount).toBe(1);
  });

  it("returns false for supported flags that are missing in storage", async () => {
    await databaseEnvironment.executeSql({
      sql: "delete from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });

    const response = await handleFeatureFlagsRequest(
      createFeatureFlagsRequest(),
      getPlatformContainer(platformContainer),
    );
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        WAITLIST_MODE: false,
      },
    });
  });

  it("keeps seed data idempotent when the seed process runs again", async () => {
    await databaseEnvironment.applySqlFiles(seedDirectoryPath);

    const rowCount = await databaseEnvironment.countRows({
      tableName: "app.feature_flags",
      values: ["WAITLIST_MODE"],
      whereClause: "name = $1",
    });

    expect(rowCount).toBe(1);
  });
});
