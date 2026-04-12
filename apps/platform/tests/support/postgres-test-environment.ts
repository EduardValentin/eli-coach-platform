import {
  buildPostgresConnectionString,
  getApplicationDatabaseUser,
  getBootstrapDatabaseUser,
  getMigrationDatabaseUser,
  type DatabaseConnection,
  type DatabaseBootstrapEnvironment,
} from "@eli-coach-platform/config";
import { createDatabaseClient, createManagedDatabasePool } from "@eli-coach-platform/db";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";

const defaultPostgresImage =
  "postgres:17.9@sha256:b994732fcf33f73776c65d3a5bf1f80c00120ba5007e8ab90307b1a743c1fc16";
const bootstrapScriptTargetPath = "/docker-entrypoint-initdb.d/01-bootstrap.sh";
const bootstrapSqlTargetPath = "/bootstrap/bootstrap.sql";
const drizzleMigrationsTableName = "__drizzle_migrations";

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
  initScriptPath: string;
  migrationsDirectoryPath: string;
  postgresImage?: string;
};

function createDatabaseConnection(options: {
  container: StartedPostgreSqlContainer;
  credentials: {
    name: string;
    password: string;
  };
}): DatabaseConnection {
  return {
    credentials: options.credentials,
    database: options.container.getDatabase(),
    host: options.container.getHost(),
    port: options.container.getPort(),
  };
}

export class PostgresTestEnvironment {
  private applicationDatabaseConnection: DatabaseConnection | null = null;
  private container: StartedPostgreSqlContainer | null = null;
  private migrationDatabaseConnection: DatabaseConnection | null = null;
  private migrationPool: Pool | null = null;

  constructor(private readonly options: PostgresTestEnvironmentOptions) {}

  getApplicationDatabaseConnection(): DatabaseConnection {
    if (!this.applicationDatabaseConnection) {
      throw new Error("Postgres test environment has not been started.");
    }

    return this.applicationDatabaseConnection;
  }

  async countRows(options: CountRowsOptions): Promise<number> {
    const result = await this.getMigrationPool().query<{ count: string }>(
      `select count(*) from ${options.tableName} where ${options.whereClause}`,
      [...options.values],
    );

    return Number(result.rows[0]?.count ?? "0");
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.getMigrationPool().query(options.sql, [...(options.values ?? [])]);
  }

  async resetToBaselineState(): Promise<void> {
    await this.truncateApplicationTables();
    await this.applySeedMigrations();
  }

  async start(): Promise<void> {
    if (this.container) {
      return;
    }

    const bootstrapUser = getBootstrapDatabaseUser(this.options.databaseBootstrapEnvironment);
    const applicationUser = getApplicationDatabaseUser(this.options.databaseBootstrapEnvironment);
    const migrationUser = getMigrationDatabaseUser(this.options.databaseBootstrapEnvironment);

    this.container = await new PostgreSqlContainer(this.options.postgresImage ?? defaultPostgresImage)
      .withDatabase(this.options.databaseBootstrapEnvironment.POSTGRES_DB)
      .withUsername(bootstrapUser.name)
      .withPassword(bootstrapUser.password)
      .withEnvironment({
        APP_DB_APP_PASSWORD: applicationUser.password,
        APP_DB_APP_USER: applicationUser.name,
        APP_DB_MIGRATION_PASSWORD: migrationUser.password,
        APP_DB_MIGRATION_USER: migrationUser.name,
        APP_DB_SCHEMA: this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA,
      })
      .withCopyFilesToContainer([
        {
          source: this.options.initScriptPath,
          target: bootstrapScriptTargetPath,
          mode: 0o755,
        },
        {
          source: this.options.bootstrapSqlPath,
          target: bootstrapSqlTargetPath,
          mode: 0o644,
        },
      ])
      .start();

    this.applicationDatabaseConnection = createDatabaseConnection({
      container: this.container,
      credentials: applicationUser,
    });
    this.migrationDatabaseConnection = createDatabaseConnection({
      container: this.container,
      credentials: migrationUser,
    });

    const migrationPool = this.getMigrationPool();

    await migrate(createDatabaseClient(migrationPool), {
      migrationsFolder: this.options.migrationsDirectoryPath,
      migrationsSchema: this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA,
      migrationsTable: drizzleMigrationsTableName,
    });
  }

  async stop(): Promise<void> {
    await this.resetMigrationPool();

    if (this.container) {
      await this.container.stop();
      this.container = null;
    }

    this.applicationDatabaseConnection = null;
    this.migrationDatabaseConnection = null;
  }

  private getMigrationPool(): Pool {
    if (!this.migrationDatabaseConnection) {
      throw new Error("Postgres test environment has not been started.");
    }

    if (!this.migrationPool) {
      this.migrationPool = createManagedDatabasePool({
        applicationName: this.options.appName,
        connectionString: buildPostgresConnectionString(this.migrationDatabaseConnection),
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

  private async applySeedMigrations(): Promise<void> {
    const seedMigrationFiles = readdirSync(this.options.migrationsDirectoryPath)
      .filter((fileName) => fileName.endsWith(".sql") && fileName.includes("_seed_"))
      .sort();

    for (const seedMigrationFile of seedMigrationFiles) {
      const sql = readFileSync(
        resolve(this.options.migrationsDirectoryPath, seedMigrationFile),
        "utf8",
      );

      await this.executeSql({
        sql,
      });
    }
  }

  private async truncateApplicationTables(): Promise<void> {
    const schemaName = this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA;
    const migrationPool = this.getMigrationPool();
    const result = await migrationPool.query<{ tableName: string }>(
      `
        select tablename as "tableName"
        from pg_tables
        where schemaname = $1
          and tablename <> $2
        order by tablename
      `,
      [schemaName, drizzleMigrationsTableName],
    );

    if (result.rows.length === 0) {
      return;
    }

    const quotedTableNames = result.rows
      .map((row) => `"${schemaName}"."${row.tableName}"`)
      .join(", ");

    await migrationPool.query(`truncate table ${quotedTableNames} restart identity cascade`);
  }
}
