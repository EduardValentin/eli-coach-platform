import {
  getApplicationDatabaseUser,
  getMigrationDatabaseUser,
  type DatabaseBootstrapEnvironment,
} from "@eli-coach-platform/config";
import { createDatabaseClient, createManagedDatabasePool } from "@eli-coach-platform/db";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client, type Pool } from "pg";

const defaultPostgresImage =
  "postgres:17.9@sha256:b994732fcf33f73776c65d3a5bf1f80c00120ba5007e8ab90307b1a743c1fc16";
const bootstrapUserName = "eli_coach_platform_bootstrap";
const bootstrapUserPassword = "bootstrap-password";

export type CountRowsOptions = {
  tableName: string;
  values: readonly unknown[];
  whereClause: string;
};

export type ExecuteSqlOptions = {
  sql: string;
  values?: readonly unknown[];
};

type PostgresTestEnvironmentOptions = {
  appName: string;
  bootstrapSqlPath: string;
  databaseBootstrapEnvironment: DatabaseBootstrapEnvironment;
  migrationsDirectoryPath: string;
  postgresImage?: string;
};

function buildConnectionString(options: {
  container: StartedPostgreSqlContainer;
  credentials: {
    name: string;
    password: string;
  };
}): string {
  return `postgresql://${options.credentials.name}:${options.credentials.password}@${options.container.getHost()}:${options.container.getPort()}/${options.container.getDatabase()}`;
}

function quoteSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderBootstrapSql(options: {
  applicationUser: {
    name: string;
    password: string;
  };
  bootstrapSqlPath: string;
  migrationUser: {
    name: string;
    password: string;
  };
  schemaName: string;
}): string {
  return readFileSync(options.bootstrapSqlPath, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("\\"))
    .join("\n")
    .replaceAll(":'app_db_schema'", quoteSqlLiteral(options.schemaName))
    .replaceAll(":'app_db_app_user'", quoteSqlLiteral(options.applicationUser.name))
    .replaceAll(":'app_db_app_password'", quoteSqlLiteral(options.applicationUser.password))
    .replaceAll(":'app_db_migration_user'", quoteSqlLiteral(options.migrationUser.name))
    .replaceAll(":'app_db_migration_password'", quoteSqlLiteral(options.migrationUser.password));
}

export class PostgresTestEnvironment {
  private applicationConnectionString = "";
  private container: StartedPostgreSqlContainer | null = null;
  private migrationConnectionString = "";
  private migrationPool: Pool | null = null;

  constructor(private readonly options: PostgresTestEnvironmentOptions) {}

  getApplicationConnectionString(): string {
    if (!this.applicationConnectionString) {
      throw new Error("Postgres test environment has not been started.");
    }

    return this.applicationConnectionString;
  }

  getMigrationConnectionString(): string {
    if (!this.migrationConnectionString) {
      throw new Error("Postgres test environment has not been started.");
    }

    return this.migrationConnectionString;
  }

  async applySqlFiles(directoryPath: string): Promise<void> {
    const seedFiles = readdirSync(directoryPath)
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();

    for (const seedFile of seedFiles) {
      const sql = readFileSync(resolve(directoryPath, seedFile), "utf8");

      await this.executeSql({
        sql,
      });
    }
  }

  async countRows(options: CountRowsOptions): Promise<number> {
    const result = await this.getMigrationPool().query<{ count: string }>(
      `select count(*) from ${options.tableName} where ${options.whereClause}`,
      [...options.values],
    );

    return Number(result.rows[0]?.count ?? "0");
  }

  async createSnapshot(): Promise<void> {
    await this.resetMigrationPool();
    await this.getContainer().snapshot();
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.getMigrationPool().query(options.sql, [...(options.values ?? [])]);
  }

  async restoreSnapshot(): Promise<void> {
    await this.resetMigrationPool();
    await this.getContainer().restoreSnapshot();
  }

  async start(): Promise<void> {
    if (this.container) {
      return;
    }

    const applicationUser = getApplicationDatabaseUser(this.options.databaseBootstrapEnvironment);
    const migrationUser = getMigrationDatabaseUser(this.options.databaseBootstrapEnvironment);

    this.container = await new PostgreSqlContainer(this.options.postgresImage ?? defaultPostgresImage)
      .withDatabase(this.options.databaseBootstrapEnvironment.POSTGRES_DB)
      .withUsername(bootstrapUserName)
      .withPassword(bootstrapUserPassword)
      .start();

    const bootstrapSql = renderBootstrapSql({
      applicationUser,
      bootstrapSqlPath: this.options.bootstrapSqlPath,
      migrationUser,
      schemaName: this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA,
    });

    const bootstrapClient = new Client({
      connectionString: this.container.getConnectionUri(),
    });

    await bootstrapClient.connect();

    try {
      await bootstrapClient.query(bootstrapSql);
    } finally {
      await bootstrapClient.end();
    }

    this.applicationConnectionString = buildConnectionString({
      container: this.container,
      credentials: applicationUser,
    });
    this.migrationConnectionString = buildConnectionString({
      container: this.container,
      credentials: migrationUser,
    });

    const migrationPool = this.getMigrationPool();

    await migrate(createDatabaseClient(migrationPool), {
      migrationsFolder: this.options.migrationsDirectoryPath,
      migrationsSchema: this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA,
      migrationsTable: "__drizzle_migrations",
    });
  }

  async stop(): Promise<void> {
    await this.resetMigrationPool();

    if (this.container) {
      await this.container.stop();
      this.container = null;
    }

    this.applicationConnectionString = "";
    this.migrationConnectionString = "";
  }

  private getContainer(): StartedPostgreSqlContainer {
    if (!this.container) {
      throw new Error("Postgres test environment has not been started.");
    }

    return this.container;
  }

  private getMigrationPool(): Pool {
    if (!this.migrationConnectionString) {
      throw new Error("Postgres test environment has not been started.");
    }

    if (!this.migrationPool) {
      this.migrationPool = createManagedDatabasePool({
        applicationName: this.options.appName,
        connectionString: this.migrationConnectionString,
      });
    }

    return this.migrationPool;
  }

  private async resetMigrationPool(): Promise<void> {
    if (!this.migrationPool) {
      return;
    }

    await this.migrationPool.end();
    this.migrationPool = null;
  }
}
