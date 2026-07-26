import {
  buildPostgresConnectionString,
  getApplicationDatabaseUser,
  getBootstrapDatabaseUser,
  getMigrationDatabaseUser,
  type DatabaseConnection,
  type DatabaseBootstrapEnvironment,
} from "@eli-coach-platform/config";
import { createManagedDatabasePool } from "@eli-coach-platform/db";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Pool, QueryResultRow } from "pg";

const postgresRuntimeBaseImagePath = "docker/postgres-runtime-base-image.txt";
const bootstrapScriptTargetPath = "/docker-entrypoint-initdb.d/01-bootstrap.sh";
const bootstrapSqlTargetPath = "/bootstrap/bootstrap.sql";
const execFileAsync = promisify(execFile);

export type CountRowsOptions = {
  tableName: string;
  values: readonly unknown[];
  whereClause: string;
};

export type ExecuteSqlOptions = {
  sql: string;
  values?: readonly unknown[];
};

export type QueryRowsOptions = {
  sql: string;
  values: readonly unknown[];
};

export type ApplyApplicationMigrationsOptions = {
  migrationsFolderOverridePath?: string;
};

type PostgresTestEnvironmentOptions = {
  appName: string;
  bootstrapSqlPath: string;
  databaseBootstrapEnvironment: DatabaseBootstrapEnvironment;
  initScriptPath: string;
  postgresImage?: string;
  workspaceRootPath: string;
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

function readDefaultPostgresImage(workspaceRootPath: string): string {
  return readFileSync(join(workspaceRootPath, postgresRuntimeBaseImagePath), "utf8").trim();
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

  async queryRows<T extends QueryResultRow>(options: QueryRowsOptions): Promise<T[]> {
    const result = await this.getMigrationPool().query<T>(options.sql, [...options.values]);

    return result.rows;
  }

  async resetToBaselineState(): Promise<void> {
    await this.dropApplicationSchema();
    await this.reconcileBootstrapState();
    await this.applyApplicationMigrations();
  }

  async start(): Promise<void> {
    await this.startWithoutApplicationMigrations();
    await this.applyApplicationMigrations();
  }

  async startWithoutApplicationMigrations(): Promise<void> {
    if (this.container) {
      return;
    }

    const bootstrapUser = getBootstrapDatabaseUser(this.options.databaseBootstrapEnvironment);
    const applicationUser = getApplicationDatabaseUser(this.options.databaseBootstrapEnvironment);
    const migrationUser = getMigrationDatabaseUser(this.options.databaseBootstrapEnvironment);

    const postgresImage = this.options.postgresImage ?? readDefaultPostgresImage(this.options.workspaceRootPath);

    this.container = await new PostgreSqlContainer(postgresImage)
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
  }

  async applyApplicationMigrations(
    options: ApplyApplicationMigrationsOptions = {},
  ): Promise<void> {
    if (!this.migrationDatabaseConnection) {
      throw new Error("Postgres test environment has not been started.");
    }

    const migrationEnvironment = {
      ...process.env,
      DATABASE_MIGRATION_URL: buildPostgresConnectionString(
        this.migrationDatabaseConnection,
      ),
    };

    delete migrationEnvironment.DATABASE_MIGRATIONS_FOLDER;

    if (options.migrationsFolderOverridePath) {
      migrationEnvironment.DATABASE_MIGRATIONS_FOLDER =
        options.migrationsFolderOverridePath;
    }

    await execFileAsync("pnpm", ["--dir", this.options.workspaceRootPath, "db:migrate"], {
      cwd: this.options.workspaceRootPath,
      env: migrationEnvironment,
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

  private async dropApplicationSchema(): Promise<void> {
    const schemaName = this.options.databaseBootstrapEnvironment.APP_DB_SCHEMA;

    await this.executeSql({
      sql: `drop schema if exists "${schemaName}" cascade`,
    });
  }

  private async reconcileBootstrapState(): Promise<void> {
    if (!this.container) {
      throw new Error("Postgres test environment has not been started.");
    }

    await this.resetMigrationPool();

    await this.container.exec(["/docker-entrypoint-initdb.d/01-bootstrap.sh"]);
  }
}
