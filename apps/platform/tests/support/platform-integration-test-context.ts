import type { PlatformContainer } from "~/server/container.server";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlatformContainer } from "../../app/server/container.server";
import { createPlatformDatabase } from "../../app/server/database.server";
import { loadIntegrationTestEnvironment } from "./integration-test-environment";
import {
  PostgresTestEnvironment,
  type CountRowsOptions,
  type ExecuteSqlOptions,
} from "./postgres-test-environment";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../../../..");
const bootstrapInitScriptPath = resolve(rootDirectory, "packages/db/scripts/docker-init-bootstrap.sh");
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");

export class PlatformIntegrationTestContext {
  private platformContainer: PlatformContainer | null = null;
  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private readonly databaseEnvironment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath,
    databaseBootstrapEnvironment: this.integrationTestEnvironment.databaseBootstrapEnvironment,
    initScriptPath: bootstrapInitScriptPath,
    workspaceRootPath: rootDirectory,
  });

  async countRows(options: CountRowsOptions): Promise<number> {
    return this.databaseEnvironment.countRows(options);
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.databaseEnvironment.executeSql(options);
  }

  getPlatformContainer(): PlatformContainer {
    if (!this.platformContainer) {
      throw new Error("Platform integration test context has not been started.");
    }

    return this.platformContainer;
  }

  async resetToBaselineState(): Promise<void> {
    await this.databaseEnvironment.resetToBaselineState();
  }

  async start(): Promise<void> {
    await this.databaseEnvironment.start();

    if (this.platformContainer) {
      return;
    }

    const databaseConnection = this.databaseEnvironment.getApplicationDatabaseConnection();
    const runtimeEnvironment = this.integrationTestEnvironment.createRuntimeEnvironment({
      databaseHost: databaseConnection.host,
      databasePort: databaseConnection.port,
    });
    const database = createPlatformDatabase({
      runtimeEnvironment,
    });

    this.platformContainer = createPlatformContainer({
      database,
    });
  }

  async stop(): Promise<void> {
    if (this.platformContainer) {
      await this.platformContainer.databasePool.end();
      this.platformContainer = null;
    }

    await this.databaseEnvironment.stop();
  }
}
