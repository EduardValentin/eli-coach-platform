import type { AppConfig } from "~/composition-root/runtime-environment";
import type { DatabaseConfig } from "~/shared/database/connection";
import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";

import { ComingSoonGate } from "~/composition-root/coming-soon/coming-soon-gate.server";
import type { ComingSoonMode } from "~/composition-root/coming-soon/config.server";
import { AppMetadataController } from "~/composition-root/api/meta/app-metadata-controller.server";
import { ReadyzController } from "~/composition-root/api/readyz/readyz-controller.server";

export type PlatformFeature = {
  appBasePath: string;
  botDetection: BotDetectionConfig;
  comingSoonGate: ComingSoonGate;
  appMetadataController: AppMetadataController;
  readyzController: ReadyzController;
};

export type PlatformControllers = Pick<
  PlatformFeature,
  "appMetadataController" | "readyzController"
>;

export type RuntimeConfig = Pick<
  PlatformFeature,
  "appBasePath" | "botDetection"
>;

type PlatformFeatureHandles = {
  app: AppConfig & DatabaseConfig;
  botDetection: BotDetectionConfig;
  comingSoonMode: ComingSoonMode;
  version: string;
};

export function composePlatformFeature(
  handles: PlatformFeatureHandles,
): PlatformFeature {
  return {
    appBasePath: handles.app.APP_BASE_PATH,
    botDetection: handles.botDetection,
    comingSoonGate: new ComingSoonGate(handles.comingSoonMode),
    appMetadataController: new AppMetadataController({
      appName: handles.app.APP_NAME,
      environment: handles.app.ENVIRONMENT,
      version: handles.version,
    }),
    readyzController: new ReadyzController(handles.app),
  };
}
