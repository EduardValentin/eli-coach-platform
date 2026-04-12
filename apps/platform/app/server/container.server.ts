import { AppMetadataController } from "~/modules/internal/app-metadata-controller.server";
import { FeatureFlagController } from "~/modules/feature-flags/feature-flag-controller.server";
import { ReadyzController } from "~/modules/internal/readyz-controller.server";
import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { type PlatformDatabase, getPlatformDatabase } from "~/server/database.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  appMetadataController: AppMetadataController;
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagController: FeatureFlagController;
  featureFlagService: FeatureFlagReader;
  readyzController: ReadyzController;
};

type CreatePlatformContainerOptions = {
  database: PlatformDatabase;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const runtimeEnvironment = getRuntimeEnvironment();
  const featureFlagRepository = new PostgresFeatureFlagRepository(options.database.databaseClient);
  const featureFlagService = new FeatureFlagService(featureFlagRepository);

  return {
    appMetadataController: new AppMetadataController({
      appName: runtimeEnvironment.APP_NAME,
      environment: runtimeEnvironment.ENVIRONMENT,
      version: process.env.GIT_SHA ?? "dev",
    }),
    databaseClient: options.database.databaseClient,
    databasePool: options.database.databasePool,
    featureFlagController: new FeatureFlagController(featureFlagService),
    featureFlagService,
    readyzController: new ReadyzController(),
  };
}

export function getPlatformContainer(): PlatformContainer {
  if (platformContainer) {
    return platformContainer;
  }

  platformContainer = createPlatformContainer({
    database: getPlatformDatabase(),
  });

  return platformContainer;
}
