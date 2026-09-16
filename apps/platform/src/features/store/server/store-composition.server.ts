import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  DownloadGrantService,
  StoreAcquisitionService,
  StoreCatalogService,
  StoreProductPublicationService,
  type StoreClock,
} from "@eli-coach-platform/domain";
import { PRIVACY_POLICY_VERSION, STORE_MARKETING_CONSENT_VERSION, WEBSITE_AND_STORE_TERMS_DOCUMENT } from "@eli-coach-platform/content";
import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import type { ManagementAuthConfig, ManagementAuthenticator } from "@eli-coach-platform/infrastructure/management-auth/server";

import { StoreAcquisitionController } from "~/features/store/api/acquisitions-controller.server";
import { StoreCatalogController } from "~/features/store/api/catalog-controller.server";
import { StoreCoverAssetController } from "~/features/store/api/covers-controller.server";
import { StoreDownloadController } from "~/features/store/api/downloads-controller.server";
import { StoreProductManagementController } from "~/features/store/api/management-controller.server";
import { ZipDeliveryStream } from "~/features/store/api/zip-stream.server";
import { PostgresStoreAcquisitionRepository } from "~/features/store/data/acquisition-repository.server";
import { ProductAssetSha256Digest } from "~/features/store/data/asset-digest.server";
import { FilesystemProductAssetStore } from "~/features/store/data/asset-store.server";
import { PostgresStoreCatalogRepository } from "~/features/store/data/catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/features/store/data/download-grant-repository.server";
import { DownloadTokenSha256, PayloadSha256Digest, RandomDownloadTokenGenerator } from "~/features/store/data/download-token.server";
import { PostgresStoreProductPublicationRepository } from "~/features/store/data/publication-repository.server";
import { createStoreDeliveryService } from "~/features/store/email/create-store-delivery-service.server";

export type StoreFeature = {
  acquisitions: StoreAcquisitionController;
  catalog: StoreCatalogController;
  covers: StoreCoverAssetController;
  downloads: StoreDownloadController;
  management: StoreProductManagementController;
};

export type StoreFeatureHandles = {
  appBasePath: string;
  botVerifier: BotVerifier;
  clock: StoreClock;
  database: DatabaseClient;
  managementAuth: { authenticator: ManagementAuthenticator; config: ManagementAuthConfig };
  runtimeEnvironment: RuntimeEnvironment;
  storeAssetRoot: string;
};

const STORE_CONSENT_VERSIONS = {
  marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
};

export function composeStoreFeature(handles: StoreFeatureHandles): StoreFeature {
  const catalogRepository = new PostgresStoreCatalogRepository(handles.database);
  const catalogService = new StoreCatalogService(catalogRepository);
  const assetStore = new FilesystemProductAssetStore(handles.storeAssetRoot);
  assetStore.assertReadyAtStartup();
  const acquisitionService = new StoreAcquisitionService({
    acquisitionRepository: new PostgresStoreAcquisitionRepository(handles.database),
    catalogRepository,
    clock: handles.clock,
    consentVersions: STORE_CONSENT_VERSIONS,
    deliveryService: createStoreDeliveryService(handles.runtimeEnvironment),
    payloadDigestGenerator: new PayloadSha256Digest(),
    tokenGenerator: new RandomDownloadTokenGenerator(),
  });
  const publicationService = new StoreProductPublicationService({
    assetWriter: assetStore,
    digest: new ProductAssetSha256Digest(),
    repository: new PostgresStoreProductPublicationRepository(handles.database),
  });
  const grantService = new DownloadGrantService({
    clock: handles.clock,
    repository: new PostgresDownloadGrantRepository(handles.database),
    tokenHasher: new DownloadTokenSha256(),
  });

  return {
    acquisitions: new StoreAcquisitionController(acquisitionService, handles.botVerifier),
    catalog: new StoreCatalogController(catalogService, { appBasePath: handles.appBasePath }),
    covers: new StoreCoverAssetController(catalogService, assetStore),
    downloads: new StoreDownloadController(grantService, assetStore, {
      appBasePath: handles.appBasePath,
      zipDeliveryStream: new ZipDeliveryStream(assetStore),
    }),
    management: new StoreProductManagementController({
      authConfig: handles.managementAuth.config,
      authenticator: handles.managementAuth.authenticator,
      publicationService,
    }),
  };
}
