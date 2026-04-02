import { featureFlagValueSchema } from "@eli-coach-platform/contracts";
import {
  createDatabaseClient,
  createManagedDatabasePool,
  createPostgresFeatureFlagRepository,
  reconcileDatabaseAccess,
} from "@eli-coach-platform/db";
import { createFeatureFlagService } from "@eli-coach-platform/domain";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { handleFeatureFlagRequest } from "../app/modules/feature-flags/feature-flag-api.server";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../../..");
const postgresImage =
  "postgres:17.9@sha256:b994732fcf33f73776c65d3a5bf1f80c00120ba5007e8ab90307b1a743c1fc16";
const schemaName = "app";
const applicationUser = {
  name: "eli_coach_platform_app",
  password: "app-password",
};
const migrationUser = {
  name: "eli_coach_platform_migration",
  password: "migration-password",
};
const migrationsDirectoryPath = resolve(rootDirectory, "packages/db/drizzle");
const seedDirectoryPath = resolve(rootDirectory, "packages/db/seeds");

let container: StartedPostgreSqlContainer;
let applicationConnectionString = "";
let migrationConnectionString = "";

function buildConnectionString(credentials: { name: string; password: string }): string {
  return `postgresql://${credentials.name}:${credentials.password}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
}

async function runMigrations(databaseUrl: string) {
  const pool = createManagedDatabasePool({
    applicationName: "feature-flag-migration-tests",
    connectionString: databaseUrl,
  });
  const database = createDatabaseClient(pool);

  try {
    await migrate(database, {
      migrationsFolder: migrationsDirectoryPath,
      migrationsSchema: "app",
      migrationsTable: "__drizzle_migrations",
    });
  } finally {
    await pool.end();
  }
}

async function applySeedData(databaseUrl: string) {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    const seedFiles = readdirSync(seedDirectoryPath)
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const seedFile of seedFiles) {
      const sql = readFileSync(resolve(seedDirectoryPath, seedFile), "utf8");

      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function queryFeatureFlagRowCount(databaseUrl: string, name: string): Promise<number> {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    const result = await client.query<{ count: string }>(
      "select count(*) from app.feature_flags where name = $1",
      [name],
    );

    return Number(result.rows[0]?.count ?? "0");
  } finally {
    await client.end();
  }
}

function createFeatureFlagDependencies() {
  const pool = createManagedDatabasePool({
    applicationName: "feature-flag-integration-tests",
    connectionString: applicationConnectionString,
  });
  const database = createDatabaseClient(pool);
  const repository = createPostgresFeatureFlagRepository(database);

  return {
    featureFlagReader: createFeatureFlagService(repository),
    pool,
  };
}

describe.sequential("feature flag API integration", () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer(postgresImage)
      .withDatabase("eli_coach_platform_test")
      .withUsername("eli_coach_platform_bootstrap")
      .withPassword("bootstrap-password")
      .start();

    await reconcileDatabaseAccess({
      adminConnectionString: container.getConnectionUri(),
      applicationUser,
      migrationUser,
      schemaName,
    });

    migrationConnectionString = buildConnectionString(migrationUser);
    applicationConnectionString = buildConnectionString(applicationUser);

    await runMigrations(migrationConnectionString);
    await applySeedData(migrationConnectionString);
    await container.snapshot();
  }, 120000);

  afterEach(async () => {
    await container.restoreSnapshot();
  });

  afterAll(async () => {
    await container.stop();
  });

  it("returns the seeded feature flag value and preserves the stored database row", async () => {
    const dependencies = createFeatureFlagDependencies();

    try {
      const response = await handleFeatureFlagRequest(
        new Request("http://localhost/api/feature-flags/WAITLIST_MODE"),
        dependencies,
      );
      const body = featureFlagValueSchema.parse(await response.json());
      const rowCount = await queryFeatureFlagRowCount(migrationConnectionString, "WAITLIST_MODE");

      expect(response.status).toBe(200);
      expect(body).toEqual({
        name: "WAITLIST_MODE",
        enabled: true,
      });
      expect(rowCount).toBe(1);
    } finally {
      await dependencies.pool.end();
    }
  });

  it("returns false for a missing feature flag", async () => {
    const dependencies = createFeatureFlagDependencies();

    try {
      const response = await handleFeatureFlagRequest(
        new Request("http://localhost/api/feature-flags/UNKNOWN_FLAG"),
        dependencies,
      );
      const body = featureFlagValueSchema.parse(await response.json());

      expect(response.status).toBe(200);
      expect(body).toEqual({
        name: "UNKNOWN_FLAG",
        enabled: false,
      });
    } finally {
      await dependencies.pool.end();
    }
  });

  it("keeps seed data idempotent when the seed process runs again", async () => {
    await applySeedData(migrationConnectionString);

    const rowCount = await queryFeatureFlagRowCount(migrationConnectionString, "WAITLIST_MODE");

    expect(rowCount).toBe(1);
  });
});
