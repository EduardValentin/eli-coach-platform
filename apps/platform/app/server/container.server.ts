import { AppMetadataController } from "~/modules/internal/app-metadata-controller.server";
import { createBotVerifier } from "~/modules/bot-detection/create-bot-verifier.server";
import { FeatureFlagController } from "~/modules/feature-flags/feature-flag-controller.server";
import { createWaitlistConfirmationSender } from "~/modules/product-email/create-waitlist-confirmation-sender.server";
import { ReadyzController } from "~/modules/internal/readyz-controller.server";
import { WaitlistController } from "~/modules/waitlist/waitlist-controller.server";
import { type RuntimeEnvironment } from "@eli-coach-platform/config";
import {
  PostgresFeatureFlagRepository,
  PostgresWaitlistRepository,
  type DatabaseClient,
} from "@eli-coach-platform/db";
import {
  FeatureFlagService,
  WaitingListService,
  type FeatureFlagReader,
} from "@eli-coach-platform/domain";
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
  waitlistController: WaitlistController;
  waitingListService: WaitingListService;
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
  const botVerifier = createBotVerifier({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const waitlistRepository = new PostgresWaitlistRepository(database.databaseClient);
  const waitingListService = new WaitingListService({
    cap: options.runtimeEnvironment.WAITLIST_CAP,
    confirmationSender: createWaitlistConfirmationSender({
      runtimeEnvironment: options.runtimeEnvironment,
    }),
    featureFlagReader: featureFlagService,
    offer: {
      plan: options.runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      slug: options.runtimeEnvironment.WAITLIST_ACTIVE_OFFER_SLUG,
    },
    repository: waitlistRepository,
  });

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
    waitlistController: new WaitlistController(waitingListService, botVerifier),
    waitingListService,
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
