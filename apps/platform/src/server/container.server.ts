import { AppMetadataController } from "~/server/api/app-metadata-controller.server";
import { AccountController } from "~/features/accounts/api/account-controller.server";
import { AccountWebhookController } from "~/features/accounts/api/webhook-controller.server";
import { PostgresAccountRepository } from "~/features/accounts/data/account-repository.server";
import { createClerkVerifiedEmailDirectory } from "~/features/accounts/data/clerk-verified-email-directory.server";
import {
  BotDetectionController,
  createBotDetectionConfig,
  createBotVerifier,
} from "@eli-coach-platform/infrastructure/bot-detection/server";
import {
  FeatureFlagController,
  PostgresFeatureFlagRepository,
} from "@eli-coach-platform/infrastructure/feature-flags/server";
import {
  BearerSecretManagementAuthenticator,
  createManagementAuthConfig,
} from "@eli-coach-platform/infrastructure/management-auth/server";
import {
  FilesystemFileStore,
  Sha256FileDigest,
} from "@eli-coach-platform/infrastructure/file-store/server";
import { ReadyzController } from "~/server/api/readyz-controller.server";
import { ExerciseLibraryController } from "~/features/exercises/api/exercise-library-controller.server";
import { ExerciseVideoController } from "~/features/exercises/api/exercise-video-controller.server";
import { PostgresExerciseRepository } from "~/features/exercises/data/exercise-repository.server";
import { createStoreDeliveryService } from "~/features/store/email/create-store-delivery-service.server";
import { StoreAcquisitionController } from "~/features/store/api/acquisitions-controller.server";
import { StoreCatalogController } from "~/features/store/api/catalog-controller.server";
import { StoreOwnershipController } from "~/features/store/api/ownership-controller.server";
import { StoreProductManagementController } from "~/features/store/api/management-controller.server";
import { ProductAssetSha256Digest } from "~/features/store/data/asset-digest.server";
import { PostgresStoreProductPublicationRepository } from "~/features/store/data/publication-repository.server";
import { StoreCoverAssetController } from "~/features/store/api/covers-controller.server";
import { StoreDownloadController } from "~/features/store/api/downloads-controller.server";
import {
  DownloadTokenSha256,
  PayloadSha256Digest,
  RandomDownloadTokenGenerator,
} from "~/features/store/data/download-token.server";
import { ZipDeliveryStream } from "~/features/store/api/zip-stream.server";
import { WaitlistController } from "~/features/waitlist/api/waitlist-controller.server";
import { createWaitlistConfirmationService } from "~/features/waitlist/email/create-waitlist-confirmation-service.server";
import { type RuntimeEnvironment } from "@eli-coach-platform/config";
import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WAITLIST_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import { PostgresStoreAcquisitionRepository } from "~/features/store/data/acquisition-repository.server";
import { PostgresStoreCatalogRepository } from "~/features/store/data/catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/features/store/data/download-grant-repository.server";
import { PostgresStoreRecipientOwnershipRepository } from "~/features/store/data/recipient-ownership-repository.server";
import { PostgresWaitlistRepository } from "~/features/waitlist/data/repository.server";
import {
  AccountProvisioningService,
  ExerciseLibraryService,
  FeatureFlagService,
  DownloadGrantService,
  StoreAcquisitionService,
  StoreCatalogService,
  StoreOwnershipLinkingService,
  StoreProductPublicationService,
  WaitlistService,
  type AccountRepository,
  type FeatureFlagReader,
  type WaitlistConsentVersions,
} from "@eli-coach-platform/domain";
import type { StoreClock } from "@eli-coach-platform/domain";
import { createPlatformDatabase } from "~/server/database.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

export type PlatformContainer = {
  accountController: AccountController;
  accountProvisioningService: AccountProvisioningService;
  accountRepository: AccountRepository;
  accountWebhookController: AccountWebhookController;
  appMetadataController: AppMetadataController;
  botDetectionController: BotDetectionController;
  closeDatabase: () => Promise<void>;
  exerciseLibraryController: ExerciseLibraryController;
  exerciseVideoController: ExerciseVideoController;
  featureFlagController: FeatureFlagController;
  featureFlagService: FeatureFlagReader;
  readyzController: ReadyzController;
  storeAcquisitionController: StoreAcquisitionController;
  storeCatalogController: StoreCatalogController;
  storeCoverAssetController: StoreCoverAssetController;
  storeDownloadController: StoreDownloadController;
  storeOwnershipController: StoreOwnershipController;
  storeProductManagementController: StoreProductManagementController;
  waitlistController: WaitlistController;
  waitlistService: WaitlistService;
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
  const accountRepository = new PostgresAccountRepository(database.client);
  const accountProvisioningService = new AccountProvisioningService({
    repository: accountRepository,
    bootstrapCoachAuthSubjectId:
      options.runtimeEnvironment.BOOTSTRAP_COACH_AUTH_SUBJECT_ID,
  });
  const clock: StoreClock = { now: () => new Date() };
  const botDetectionConfig = createBotDetectionConfig(
    options.runtimeEnvironment,
  );
  const featureFlagRepository = new PostgresFeatureFlagRepository(database.client);
  const featureFlagService = new FeatureFlagService(featureFlagRepository);
  const botVerifier = createBotVerifier({
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const waitlistRepository = new PostgresWaitlistRepository(database.client);
  const storeCatalogRepository = new PostgresStoreCatalogRepository(database.client);
  const storeCatalogService = new StoreCatalogService(storeCatalogRepository);
  const assetStore = new FilesystemFileStore(
    options.runtimeEnvironment.ASSET_ROOT,
  );
  assetStore.assertReadyAtStartup();
  const exerciseLibraryService = new ExerciseLibraryService({
    digest: new Sha256FileDigest(),
    repository: new PostgresExerciseRepository(database.client),
    videoStore: assetStore,
  });
  const downloadTokenSha256 = new DownloadTokenSha256();
  const storeAcquisitionService = new StoreAcquisitionService({
    acquisitionRepository: new PostgresStoreAcquisitionRepository(database.client),
    catalogRepository: storeCatalogRepository,
    clock,
    consentVersions: {
      marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    },
    deliveryService: createStoreDeliveryService(options.runtimeEnvironment),
    payloadDigestGenerator: new PayloadSha256Digest(),
    tokenGenerator: new RandomDownloadTokenGenerator(),
  });
  const managementAuthConfig = createManagementAuthConfig(
    options.runtimeEnvironment,
  );
  const storeProductPublicationService = new StoreProductPublicationService({
    assetWriter: assetStore,
    digest: new ProductAssetSha256Digest(),
    repository: new PostgresStoreProductPublicationRepository(database.client),
  });
  const storeOwnershipLinkingService = new StoreOwnershipLinkingService({
    accountRepository,
    ownershipRepository: new PostgresStoreRecipientOwnershipRepository(
      database.client,
    ),
  });
  const downloadGrantService = new DownloadGrantService({
    clock,
    repository: new PostgresDownloadGrantRepository(database.client),
    tokenHasher: downloadTokenSha256,
  });
  const waitlistService = new WaitlistService({
    cap: options.runtimeEnvironment.WAITLIST_CAP,
    confirmationService: createWaitlistConfirmationService({
      runtimeEnvironment: options.runtimeEnvironment,
    }),
    consentVersions: waitlistConsentVersions,
    enabled: options.runtimeEnvironment.WAITLIST_MODE,
    offer: {
      plan: options.runtimeEnvironment.WAITLIST_ACTIVE_OFFER_PLAN,
      campaignSlug: options.runtimeEnvironment.WAITLIST_ACTIVE_CAMPAIGN_SLUG,
    },
    repository: waitlistRepository,
  });

  return {
    accountController: new AccountController(),
    accountProvisioningService,
    accountRepository,
    accountWebhookController: new AccountWebhookController(
      accountRepository,
      options.runtimeEnvironment.CLERK_WEBHOOK_SIGNING_SECRET,
    ),
    appMetadataController: new AppMetadataController({
      appName: options.runtimeEnvironment.APP_NAME,
      environment: options.runtimeEnvironment.ENVIRONMENT,
      version: process.env.GIT_SHA ?? "dev",
    }),
    botDetectionController: new BotDetectionController(botDetectionConfig),
    closeDatabase: () => database.close(),
    exerciseLibraryController: new ExerciseLibraryController({
      appBasePath: options.runtimeEnvironment.APP_BASE_PATH,
      service: exerciseLibraryService,
    }),
    exerciseVideoController: new ExerciseVideoController({
      service: exerciseLibraryService,
      videoStore: assetStore,
    }),
    featureFlagController: new FeatureFlagController(featureFlagService),
    featureFlagService,
    readyzController: new ReadyzController(options.runtimeEnvironment),
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
    storeOwnershipController: new StoreOwnershipController({
      createVerifiedEmailDirectory: createClerkVerifiedEmailDirectory,
      linkingService: storeOwnershipLinkingService,
    }),
    storeProductManagementController: new StoreProductManagementController({
      authConfig: managementAuthConfig,
      authenticator: new BearerSecretManagementAuthenticator({
        principalId: managementAuthConfig.principalId,
        secret: managementAuthConfig.secret,
      }),
      publicationService: storeProductPublicationService,
    }),
    waitlistController: new WaitlistController(waitlistService, botVerifier),
    waitlistService,
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
