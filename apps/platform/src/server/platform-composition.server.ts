import type { DatabaseClient } from "@eli-coach-platform/db";
import type { AppConfig, DatabaseConfig } from "@eli-coach-platform/config";
import { FeatureFlagService } from "@eli-coach-platform/domain/feature-flags";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import { PostgresFeatureFlagRepository } from "@eli-coach-platform/infrastructure/feature-flags/server";

import { AppMetadataController } from "~/server/api/app-metadata-controller.server";
import { FeatureFlagController } from "~/server/api/feature-flags-controller.server";
import { ReadyzController } from "~/server/api/readyz-controller.server";

export type PlatformFeature = {
  appBasePath: string;
  botDetection: BotDetectionConfig;
  featureFlags: FeatureFlagController;
  metadata: AppMetadataController;
  readyz: ReadyzController;
};

export type PlatformControllers = Pick<PlatformFeature, "featureFlags" | "metadata" | "readyz">;

export type RuntimeConfig = Pick<PlatformFeature, "appBasePath" | "botDetection">;

export type PlatformFeatureHandles = {
  app: AppConfig & DatabaseConfig;
  botDetection: BotDetectionConfig;
  database: DatabaseClient;
  version: string;
};

export function composePlatformFeature(handles: PlatformFeatureHandles): PlatformFeature {
  const featureFlagService = new FeatureFlagService(new PostgresFeatureFlagRepository(handles.database));

  return {
    appBasePath: handles.app.APP_BASE_PATH,
    botDetection: handles.botDetection,
    featureFlags: new FeatureFlagController(featureFlagService),
    metadata: new AppMetadataController({
      appName: handles.app.APP_NAME,
      environment: handles.app.ENVIRONMENT,
      version: handles.version,
    }),
    readyz: new ReadyzController(handles.app),
  };
}
