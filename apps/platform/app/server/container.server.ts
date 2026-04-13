import { AppMetadataController } from "~/modules/internal/app-metadata-controller.server";
import { FeatureFlagController } from "~/modules/feature-flags/feature-flag-controller.server";
import { ReadyzController } from "~/modules/internal/readyz-controller.server";
import { type RuntimeEnvironment } from "@eli-coach-platform/config";
import { PostgresFeatureFlagRepository, type DatabaseClient } from "@eli-coach-platform/db";
import { FeatureFlagService, type FeatureFlagReader } from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { createPlatformDatabase } from "~/server/database.server";
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
  runtimeEnvironment: RuntimeEnvironment;
};

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const database = createPlatformDatabase({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const featureFlagRepository = new PostgresFeatureFlagRepository(database.databaseClient);
  const featureFlagService = new FeatureFlagService(featureFlagRepository);

  return {
    appMetadataController: new AppMetadataController({
      appName: options.runtimeEnvironment.APP_NAME,
      environment: options.runtimeEnvironment.ENVIRONMENT,
      version: process.env.GIT_SHA ?? "dev",
    }),
    databaseClient: database.databaseClient,
    databasePool: database.databasePool,
    featureFlagController: new FeatureFlagController(featureFlagService),
    featureFlagService,
    readyzController: new ReadyzController(),
  };
}

export function getPlatformContainer(): PlatformContainer {
  if (platformContainer) {
    return platformContainer;
  }

  const runtimeEnvironment = getRuntimeEnvironment();

  platformContainer = createPlatformContainer({
    runtimeEnvironment,
  });

  return platformContainer;
}
