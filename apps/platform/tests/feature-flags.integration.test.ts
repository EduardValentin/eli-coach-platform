import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { featureFlagValueSchema } from "@eli-coach-platform/contracts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { handleFeatureFlagRequest } from "../app/modules/feature-flags/feature-flag-api.server";
import { createPlatformContainer } from "../app/server/container.server";
import { createPlatformDatabase } from "../app/server/database.server";
import { createPostgresTestEnvironment } from "./support/postgres-test-environment";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../../..");
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");
const migrationsDirectoryPath = resolve(rootDirectory, "packages/db/drizzle");
const seedDirectoryPath = resolve(rootDirectory, "packages/db/seeds");
const testRuntimeEnvironment = loadRuntimeEnvironment({
  APP_NAME: "eli-coach-platform",
  ENVIRONMENT: "test",
  NODE_ENV: "test",
});

const databaseEnvironment = createPostgresTestEnvironment({
  appName: testRuntimeEnvironment.APP_NAME,
  applicationUser: {
    name: "eli_coach_platform_app",
    password: "app-password",
  },
  bootstrapSqlPath,
  databaseName: "eli_coach_platform_test",
  migrationUser: {
    name: "eli_coach_platform_migration",
    password: "migration-password",
  },
  migrationsDirectoryPath,
  schemaName: "app",
});

function createIntegrationTestPlatformContainer() {
  const runtimeEnvironment = loadRuntimeEnvironment({
    APP_NAME: testRuntimeEnvironment.APP_NAME,
    DATABASE_URL: databaseEnvironment.applicationConnectionString,
    ENVIRONMENT: testRuntimeEnvironment.ENVIRONMENT,
    NODE_ENV: testRuntimeEnvironment.NODE_ENV,
  });
  const database = createPlatformDatabase({
    connectionString: databaseEnvironment.applicationConnectionString,
    runtimeEnvironment,
  });

  return createPlatformContainer({
    database,
    runtimeEnvironment,
  });
}

describe.sequential("feature flag API integration", () => {
  beforeAll(async () => {
    await databaseEnvironment.start();
    await databaseEnvironment.applySqlFiles(seedDirectoryPath);
    await databaseEnvironment.createSnapshot();
  }, 120000);

  afterEach(async () => {
    await databaseEnvironment.restoreSnapshot();
  });

  afterAll(async () => {
    await databaseEnvironment.stop();
  });

  it("returns the seeded feature flag value and preserves the stored database row", async () => {
    const platformContainer = createIntegrationTestPlatformContainer();

    try {
      const response = await handleFeatureFlagRequest(
        new Request("http://localhost/api/feature-flags/WAITLIST_MODE"),
        platformContainer,
      );
      const body = featureFlagValueSchema.parse(await response.json());
      const rowCount = await databaseEnvironment.countRows({
        tableName: "app.feature_flags",
        values: ["WAITLIST_MODE"],
        whereClause: "name = $1",
      });

      expect(response.status).toBe(200);
      expect(body).toEqual({
        name: "WAITLIST_MODE",
        enabled: true,
      });
      expect(rowCount).toBe(1);
    } finally {
      await platformContainer.databasePool.end();
    }
  });

  it("returns false for a missing feature flag", async () => {
    const platformContainer = createIntegrationTestPlatformContainer();

    try {
      const response = await handleFeatureFlagRequest(
        new Request("http://localhost/api/feature-flags/UNKNOWN_FLAG"),
        platformContainer,
      );
      const body = featureFlagValueSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(body).toEqual({
        name: "UNKNOWN_FLAG",
        enabled: false,
      });
    } finally {
      await platformContainer.databasePool.end();
    }
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
