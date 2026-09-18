import type { AppConfig, DatabaseConfig } from "@eli-coach-platform/config";
import type { FeatureFlagReader } from "@eli-coach-platform/domain/feature-flag";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import { AppMetadataController } from "~/server/api/meta/app-metadata-controller.server";
import { FeatureFlagController } from "~/server/api/feature-flags/feature-flags-controller.server";
import { ReadyzController } from "~/server/api/readyz/readyz-controller.server";

export type PlatformFeature = {
  appBasePath: string;
  botDetection: BotDetectionConfig;
  featureFlags: FeatureFlagController;
  metadata: AppMetadataController;
  readyz: ReadyzController;
};

export type PlatformControllers = Pick<
  PlatformFeature,
  "featureFlags" | "metadata" | "readyz"
>;

export type RuntimeConfig = Pick<
  PlatformFeature,
  "appBasePath" | "botDetection"
>;

type PlatformFeatureHandles = {
  app: AppConfig & DatabaseConfig;
  botDetection: BotDetectionConfig;
  featureFlags: FeatureFlagReader;
  version: string;
};

export function composePlatformFeature(
  handles: PlatformFeatureHandles,
): PlatformFeature {
  return {
    appBasePath: handles.app.APP_BASE_PATH,
    botDetection: handles.botDetection,
    featureFlags: new FeatureFlagController(handles.featureFlags),
    metadata: new AppMetadataController({
      appName: handles.app.APP_NAME,
      environment: handles.app.ENVIRONMENT,
      version: handles.version,
    }),
    readyz: new ReadyzController(handles.app),
  };
}
