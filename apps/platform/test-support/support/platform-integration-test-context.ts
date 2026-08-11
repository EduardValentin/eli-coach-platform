import type { PlatformContainer } from "~/server/container.server";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { QueryResultRow } from "pg";
import { createPlatformContainer } from "~/server/container.server";
import { loadIntegrationTestEnvironment } from "./integration-test-environment";
import {
  PostgresTestEnvironment,
  type CountRowsOptions,
  type ExecuteSqlOptions,
  type QueryRowsOptions,
} from "./postgres-test-environment";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const rootDirectory = resolve(currentDirectory, "../../../..");
const bootstrapInitScriptPath = resolve(rootDirectory, "packages/db/scripts/docker-init-bootstrap.sh");
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");

export class PlatformIntegrationTestContext {
  private platformContainer: PlatformContainer | null = null;
  private storeAssetRoot: string | null = null;
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

  async queryRows<T extends QueryResultRow>(options: QueryRowsOptions): Promise<T[]> {
    return this.databaseEnvironment.queryRows<T>(options);
  }

  getPlatformContainer(): PlatformContainer {
    if (!this.platformContainer) {
      throw new Error("Platform integration test context has not been started.");
    }

    return this.platformContainer;
  }

  getStoreAssetRoot(): string {
    if (!this.storeAssetRoot) {
      throw new Error("Platform integration test context has not been started.");
    }

    return this.storeAssetRoot;
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
    this.storeAssetRoot ??= await mkdtemp(
      join(tmpdir(), "eli-coach-store-assets-integration-"),
    );
    const runtimeEnvironment = this.integrationTestEnvironment.createRuntimeEnvironment({
      databaseHost: databaseConnection.host,
      databasePort: databaseConnection.port,
      storeAssetRoot: this.storeAssetRoot,
    });

    this.platformContainer = createPlatformContainer({
      runtimeEnvironment,
    });
  }

  async stop(): Promise<void> {
    if (this.platformContainer) {
      await this.platformContainer.databasePool.end();
      this.platformContainer = null;
    }

    if (this.storeAssetRoot) {
      await rm(this.storeAssetRoot, { force: true, recursive: true });
      this.storeAssetRoot = null;
    }

    await this.databaseEnvironment.stop();
  }
}
