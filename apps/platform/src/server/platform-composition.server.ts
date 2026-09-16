import type { DatabaseClient } from "@eli-coach-platform/db";
import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { FeatureFlagService } from "@eli-coach-platform/domain";
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
  appBasePath: string;
  botDetection: BotDetectionConfig;
  database: DatabaseClient;
  runtimeEnvironment: RuntimeEnvironment;
  version: string;
};

export function composePlatformFeature(handles: PlatformFeatureHandles): PlatformFeature {
  const featureFlagService = new FeatureFlagService(new PostgresFeatureFlagRepository(handles.database));

  return {
    appBasePath: handles.appBasePath,
    botDetection: handles.botDetection,
    featureFlags: new FeatureFlagController(featureFlagService),
    metadata: new AppMetadataController({
      appName: handles.runtimeEnvironment.APP_NAME,
      environment: handles.runtimeEnvironment.ENVIRONMENT,
      version: handles.version,
    }),
    readyz: new ReadyzController(handles.runtimeEnvironment),
  };
}
