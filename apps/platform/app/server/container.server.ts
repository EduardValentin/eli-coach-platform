import { AppMetadataController } from "~/modules/internal/app-metadata-controller.server";
import { BotDetectionController } from "~/modules/bot-detection/bot-detection-controller.server";
import { createBotDetectionConfig } from "~/modules/bot-detection/bot-detection-config.server";
import { createBotVerifier } from "~/modules/bot-detection/create-bot-verifier.server";
import { FeatureFlagController } from "~/modules/feature-flags/feature-flag-controller.server";
import { createWaitlistConfirmationSender } from "~/modules/product-email/create-waitlist-confirmation-sender.server";
import { createStoreDeliverySender } from "~/modules/product-email/create-store-delivery-sender.server";
import { ReadyzController } from "~/modules/internal/readyz-controller.server";
import { FilesystemProductAssetStore } from "~/modules/store-assets/filesystem-product-asset-store.server";
import { StoreAcquisitionController } from "~/modules/store/store-acquisition-controller.server";
import { StoreCatalogController } from "~/modules/store/store-catalog-controller.server";
import { StoreCoverAssetController } from "~/modules/store/store-cover-asset-controller.server";
import { StoreDownloadController } from "~/modules/store/store-download-controller.server";
import {
  DownloadTokenSha256,
  PayloadSha256Digest,
  RandomDownloadTokenGenerator,
} from "~/modules/store-download/download-token.server";
import { ZipDeliveryStream } from "~/modules/store-download/zip-delivery-stream.server";
import { WaitlistController } from "~/modules/waitlist/waitlist-controller.server";
import { type RuntimeEnvironment } from "@eli-coach-platform/config";
import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import {
  PostgresFeatureFlagRepository,
  PostgresDownloadGrantRepository,
  PostgresStoreAcquisitionRepository,
  PostgresStoreCatalogRepository,
  PostgresWaitlistRepository,
  type DatabaseClient,
} from "@eli-coach-platform/db";
import {
  FeatureFlagService,
  DownloadGrantService,
  StoreAcquisitionService,
  StoreCatalogService,
  WaitingListService,
  type FeatureFlagReader,
  type WaitlistConsentVersions,
} from "@eli-coach-platform/domain";
import type { Pool } from "pg";
import { createPlatformDatabase } from "~/server/database.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  appMetadataController: AppMetadataController;
  botDetectionController: BotDetectionController;
  databaseClient: DatabaseClient;
  databasePool: Pool;
  featureFlagController: FeatureFlagController;
  featureFlagService: FeatureFlagReader;
  readyzController: ReadyzController;
  storeAcquisitionController: StoreAcquisitionController;
  storeCatalogController: StoreCatalogController;
  storeCoverAssetController: StoreCoverAssetController;
  storeDownloadController: StoreDownloadController;
  waitlistController: WaitlistController;
  waitingListService: WaitingListService;
};

type CreatePlatformContainerOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

const waitlistConsentVersions = {
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  marketingConsentVersion: WAITLIST_MARKETING_CONSENT_VERSION,
} satisfies WaitlistConsentVersions;

let platformContainer: PlatformContainer | null = null;

export function createPlatformContainer(options: CreatePlatformContainerOptions): PlatformContainer {
  const database = createPlatformDatabase({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const botDetectionConfig = createBotDetectionConfig(
    options.runtimeEnvironment,
  );
  const featureFlagRepository = new PostgresFeatureFlagRepository(database.databaseClient);
  const featureFlagService = new FeatureFlagService(featureFlagRepository);
  const botVerifier = createBotVerifier({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const waitlistRepository = new PostgresWaitlistRepository(database.databaseClient);
  const storeCatalogRepository = new PostgresStoreCatalogRepository(
    database.databaseClient,
  );
  const storeCatalogService = new StoreCatalogService(storeCatalogRepository);
  const assetStore = new FilesystemProductAssetStore(
    options.runtimeEnvironment.STORE_ASSET_ROOT,
  );
  assetStore.assertReadyAtStartup();
  const downloadTokenSha256 = new DownloadTokenSha256();
  const storeAcquisitionService = new StoreAcquisitionService({
    acquisitionRepository: new PostgresStoreAcquisitionRepository(
      database.databaseClient,
    ),
    catalogRepository: storeCatalogRepository,
    clock: { now: () => new Date() },
    consentVersions: {
      marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    },
    deliverySender: createStoreDeliverySender(options.runtimeEnvironment),
    payloadDigestGenerator: new PayloadSha256Digest(),
    tokenGenerator: new RandomDownloadTokenGenerator(),
  });
  const downloadGrantService = new DownloadGrantService({
    clock: { now: () => new Date() },
    repository: new PostgresDownloadGrantRepository(database.databaseClient),
    tokenHasher: downloadTokenSha256,
  });
  const waitingListService = new WaitingListService({
    cap: options.runtimeEnvironment.WAITLIST_CAP,
    confirmationSender: createWaitlistConfirmationSender({
      runtimeEnvironment: options.runtimeEnvironment,
    }),
    consentVersions: waitlistConsentVersions,
    featureFlagReader: featureFlagService,
    offer: {
      plan: options.runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: options.runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    repository: waitlistRepository,
  });

  return {
    appMetadataController: new AppMetadataController({
      appName: options.runtimeEnvironment.APP_NAME,
      environment: options.runtimeEnvironment.ENVIRONMENT,
      version: process.env.GIT_SHA ?? "dev",
    }),
    botDetectionController: new BotDetectionController(botDetectionConfig),
    databaseClient: database.databaseClient,
    databasePool: database.databasePool,
    featureFlagController: new FeatureFlagController(featureFlagService),
    featureFlagService,
    readyzController: new ReadyzController(),
    storeAcquisitionController: new StoreAcquisitionController(
      storeAcquisitionService,
      botVerifier,
    ),
    storeCatalogController: new StoreCatalogController(storeCatalogService, {
      appBasePath: options.runtimeEnvironment.APP_BASE_PATH,
    }),
    storeCoverAssetController: new StoreCoverAssetController(
      storeCatalogService,
      assetStore,
    ),
    storeDownloadController: new StoreDownloadController(
      downloadGrantService,
      assetStore,
      {
        appBasePath: options.runtimeEnvironment.APP_BASE_PATH,
        zipDeliveryStream: new ZipDeliveryStream(assetStore),
      },
    ),
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
