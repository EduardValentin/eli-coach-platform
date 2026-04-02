import { createDatabaseClient, createManagedDatabasePool, reconcileDatabaseAccess } from "@eli-coach-platform/db";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const defaultPostgresImage =
  "postgres:17.9@sha256:b994732fcf33f73776c65d3a5bf1f80c00120ba5007e8ab90307b1a743c1fc16";
const bootstrapUserName = "eli_coach_platform_bootstrap";
const bootstrapUserPassword = "bootstrap-password";

type DatabaseUserCredentials = {
  name: string;
  password: string;
};

type CountRowsOptions = {
  tableName: string;
  values: readonly unknown[];
  whereClause: string;
};

type CreatePostgresTestEnvironmentOptions = {
  applicationUser: DatabaseUserCredentials;
  databaseName: string;
  migrationUser: DatabaseUserCredentials;
  migrationsDirectoryPath: string;
  postgresImage?: string;
  schemaName: string;
};

export type PostgresTestEnvironment = {
  readonly applicationConnectionString: string;
  readonly migrationConnectionString: string;
  applySqlFiles(directoryPath: string): Promise<void>;
  countRows(options: CountRowsOptions): Promise<number>;
  createSnapshot(): Promise<void>;
  restoreSnapshot(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

function buildConnectionString(options: {
  container: StartedPostgreSqlContainer;
  credentials: DatabaseUserCredentials;
}): string {
  return `postgresql://${options.credentials.name}:${options.credentials.password}@${options.container.getHost()}:${options.container.getPort()}/${options.container.getDatabase()}`;
}

function getStartedContainer(container: StartedPostgreSqlContainer | null): StartedPostgreSqlContainer {
  if (!container) {
    throw new Error("Postgres test environment has not been started.");
  }

  return container;
}

async function runWithSqlClient<T>(
  connectionString: string,
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({
    connectionString,
  });

  await client.connect();

  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function runMigrations(options: {
  connectionString: string;
  migrationsDirectoryPath: string;
  schemaName: string;
}) {
  const databasePool = createManagedDatabasePool({
    applicationName: "platform-postgres-test-migrations",
    connectionString: options.connectionString,
  });
  const databaseClient = createDatabaseClient(databasePool);

  try {
    await migrate(databaseClient, {
      migrationsFolder: options.migrationsDirectoryPath,
      migrationsSchema: options.schemaName,
      migrationsTable: "__drizzle_migrations",
    });
  } finally {
    await databasePool.end();
  }
}

export function createPostgresTestEnvironment(
  options: CreatePostgresTestEnvironmentOptions,
): PostgresTestEnvironment {
  let container: StartedPostgreSqlContainer | null = null;
  let applicationConnectionString = "";
  let migrationConnectionString = "";

  return {
    get applicationConnectionString() {
      return applicationConnectionString;
    },
    get migrationConnectionString() {
      return migrationConnectionString;
    },
    async applySqlFiles(directoryPath) {
      const seedFiles = readdirSync(directoryPath)
        .filter((fileName) => fileName.endsWith(".sql"))
        .sort();

      await runWithSqlClient(migrationConnectionString, async (client) => {
        for (const seedFile of seedFiles) {
          const sql = readFileSync(resolve(directoryPath, seedFile), "utf8");

          await client.query(sql);
        }
      });
    },
    async countRows(countRowsOptions) {
      return runWithSqlClient(migrationConnectionString, async (client) => {
        const result = await client.query<{ count: string }>(
          `select count(*) from ${countRowsOptions.tableName} where ${countRowsOptions.whereClause}`,
          [...countRowsOptions.values],
        );

        return Number(result.rows[0]?.count ?? "0");
      });
    },
    async createSnapshot() {
      await getStartedContainer(container).snapshot();
    },
    async restoreSnapshot() {
      await getStartedContainer(container).restoreSnapshot();
    },
    async start() {
      if (container) {
        return;
      }

      container = await new PostgreSqlContainer(options.postgresImage ?? defaultPostgresImage)
        .withDatabase(options.databaseName)
        .withUsername(bootstrapUserName)
        .withPassword(bootstrapUserPassword)
        .start();

      await reconcileDatabaseAccess({
        adminConnectionString: container.getConnectionUri(),
        applicationUser: options.applicationUser,
        migrationUser: options.migrationUser,
        schemaName: options.schemaName,
      });

      applicationConnectionString = buildConnectionString({
        container,
        credentials: options.applicationUser,
      });
      migrationConnectionString = buildConnectionString({
        container,
        credentials: options.migrationUser,
      });

      await runMigrations({
        connectionString: migrationConnectionString,
        migrationsDirectoryPath: options.migrationsDirectoryPath,
        schemaName: options.schemaName,
      });
    },
    async stop() {
      if (!container) {
        return;
      }

      await container.stop();
      container = null;
      applicationConnectionString = "";
      migrationConnectionString = "";
    },
  };
}
