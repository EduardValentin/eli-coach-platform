import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { QueryResultRow } from "pg";

import { BaseTestContainer } from "./base-test-container";
import { loadIntegrationTestEnvironment } from "./runtime-environment";
import {
  PostgresTestEnvironment,
  type CountRowsOptions,
  type ExecuteSqlOptions,
  type QueryRowsOptions,
} from "./postgres-test-environment";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(currentDirectory, "../../..");
const bootstrapInitScriptPath = resolve(
  rootDirectory,
  "packages/db/scripts/docker-init-bootstrap.sh",
);
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");

export class PostgresContainer extends BaseTestContainer {
  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private readonly environment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath,
    databaseBootstrapEnvironment:
      this.integrationTestEnvironment.databaseBootstrapEnvironment,
    initScriptPath: bootstrapInitScriptPath,
    workspaceRootPath: rootDirectory,
  });

  async start(): Promise<void> {
    await this.environment.start();
  }

  async reset(): Promise<void> {
    await this.environment.resetToBaselineState();
  }

  async stop(): Promise<void> {
    await this.environment.stop();
  }

  settings(): Record<string, string> {
    const connection = this.environment.getApplicationDatabaseConnection();

    return {
      DATABASE_HOST: connection.host,
      DATABASE_PORT: String(connection.port),
    };
  }

  async countRows(options: CountRowsOptions): Promise<number> {
    return this.environment.countRows(options);
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.environment.executeSql(options);
  }

  async queryRows<T extends QueryResultRow>(
    options: QueryRowsOptions,
  ): Promise<T[]> {
    return this.environment.queryRows<T>(options);
  }
}
