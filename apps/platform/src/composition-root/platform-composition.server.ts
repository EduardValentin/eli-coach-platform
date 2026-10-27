import type { AppConfig } from "~/composition-root/runtime-environment";
import type { DatabaseConfig } from "~/shared/database/connection";
import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";

import { AppMetadataController } from "~/composition-root/api/meta/app-metadata-controller.server";
import { ReadyzController } from "~/composition-root/api/readyz/readyz-controller.server";

export type PlatformFeature = {
  appBasePath: string;
  botDetection: BotDetectionConfig;
  metadata: AppMetadataController;
  readyz: ReadyzController;
};

export type PlatformControllers = Pick<PlatformFeature, "metadata" | "readyz">;

export type RuntimeConfig = Pick<
  PlatformFeature,
  "appBasePath" | "botDetection"
>;

type PlatformFeatureHandles = {
  app: AppConfig & DatabaseConfig;
  botDetection: BotDetectionConfig;
  version: string;
};

export function composePlatformFeature(
  handles: PlatformFeatureHandles,
): PlatformFeature {
  return {
    appBasePath: handles.app.APP_BASE_PATH,
    botDetection: handles.botDetection,
    metadata: new AppMetadataController({
      appName: handles.app.APP_NAME,
      environment: handles.app.ENVIRONMENT,
      version: handles.version,
    }),
    readyz: new ReadyzController(handles.app),
  };
}
