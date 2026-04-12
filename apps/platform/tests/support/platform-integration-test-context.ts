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
const bootstrapSqlPath = resolve(rootDirectory, "packages/db/sql/bootstrap.sql");
const migrationsDirectoryPath = resolve(rootDirectory, "packages/db/drizzle");
const sharedSeedDirectoryPath = resolve(rootDirectory, "packages/db/seeds");

export class PlatformIntegrationTestContext {
  readonly seedDirectoryPath = sharedSeedDirectoryPath;

  private readonly integrationTestEnvironment = loadIntegrationTestEnvironment();
  private readonly databaseEnvironment = new PostgresTestEnvironment({
    appName: this.integrationTestEnvironment.runtimeEnvironment.APP_NAME,
    bootstrapSqlPath,
    databaseBootstrapEnvironment: this.integrationTestEnvironment.databaseBootstrapEnvironment,
    migrationsDirectoryPath,
  });

  async applySharedSeeds(): Promise<void> {
    await this.databaseEnvironment.applySqlFiles(this.seedDirectoryPath);
  }

  async countRows(options: CountRowsOptions): Promise<number> {
    return this.databaseEnvironment.countRows(options);
  }

  createPlatformContainer(): PlatformContainer {
    const runtimeEnvironment = this.integrationTestEnvironment.createRuntimeEnvironment({
      databaseUrl: this.databaseEnvironment.getApplicationConnectionString(),
    });
    const database = createPlatformDatabase({
      runtimeEnvironment,
    });

    return createPlatformContainer({
      database,
    });
  }

  async createSnapshot(): Promise<void> {
    await this.databaseEnvironment.createSnapshot();
  }

  async executeSql(options: ExecuteSqlOptions): Promise<void> {
    await this.databaseEnvironment.executeSql(options);
  }

  async restoreSnapshot(): Promise<void> {
    await this.databaseEnvironment.restoreSnapshot();
  }

  async start(): Promise<void> {
    await this.databaseEnvironment.start();
  }

  async stop(): Promise<void> {
    await this.databaseEnvironment.stop();
  }
}

let sharedPlatformIntegrationTestContext: PlatformIntegrationTestContext | null = null;

export function getSharedPlatformIntegrationTestContext(): PlatformIntegrationTestContext {
  if (!sharedPlatformIntegrationTestContext) {
    sharedPlatformIntegrationTestContext = new PlatformIntegrationTestContext();
  }

  return sharedPlatformIntegrationTestContext;
}
