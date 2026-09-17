import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  DownloadGrantService,
  StoreAcquisitionService,
  StoreProductPublicationService,
} from "@eli-coach-platform/domain/store";
import {
  FindPublishedCoverUseCase,
  FindPublishedProductUseCase,
  ListPublishedProductsUseCase,
} from "@eli-coach-platform/domain/product";
import type {
  BotVerifier,
  Clock,
  Logger,
  ManagementAuthenticator,
  ProductEmail,
} from "@eli-coach-platform/domain/shared";
import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import type { ManagementAuthConfig } from "@eli-coach-platform/infrastructure/management-auth/server";

import { StoreAcquisitionController } from "~/features/store/api/acquisitions/acquisitions-controller.server";
import { StoreCatalogController } from "~/features/store/api/catalog/catalog-controller.server";
import { StoreCoverAssetController } from "~/features/store/api/covers/covers-controller.server";
import { StoreDownloadController } from "~/features/store/api/downloads/downloads-controller.server";
import { StoreProductManagementController } from "~/features/store/api/management/management-controller.server";
import { ZipDeliveryStream } from "~/features/store/api/downloads/zip-stream.server";
import { PostgresStoreAcquisitionRepository } from "~/features/store/data/acquisitions/acquisition-repository.server";
import { ProductAssetSha256Digest } from "~/features/store/data/assets/asset-digest.server";
import { FilesystemProductAssetStore } from "~/features/store/data/assets/asset-store.server";
import { PostgresStoreCatalogRepository } from "~/features/store/data/catalog/catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/features/store/data/download-grants/download-grant-repository.server";
import {
  DownloadTokenSha256,
  PayloadSha256Digest,
  RandomDownloadTokenGenerator,
} from "~/features/store/data/download-grants/download-token.server";
import { PostgresStoreProductPublicationRepository } from "~/features/store/data/publications/publication-repository.server";
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
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  logger: Logger;
  managementAuth: {
    authenticator: ManagementAuthenticator;
    config: ManagementAuthConfig;
  };
  productEmail: ProductEmail;
  publicAppUrl: string;
  storeAssetRoot: string;
};

const STORE_CONSENT_VERSIONS = {
  marketingConsentVersion: STORE_MARKETING_CONSENT_VERSION,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  termsVersion: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
};

export function composeStoreFeature(
  handles: StoreFeatureHandles,
): StoreFeature {
  const catalogRepository = new PostgresStoreCatalogRepository(
    handles.database,
  );
  const listPublishedProducts = new ListPublishedProductsUseCase({
    catalog: catalogRepository,
  });
  const findPublishedProduct = new FindPublishedProductUseCase({
    catalog: catalogRepository,
  });
  const findPublishedCover = new FindPublishedCoverUseCase({
    catalog: catalogRepository,
  });
  const assetStore = new FilesystemProductAssetStore(handles.storeAssetRoot);
  assetStore.assertReadyAtStartup();
  const acquisitionService = new StoreAcquisitionService({
    acquisitionRepository: new PostgresStoreAcquisitionRepository(
      handles.database,
    ),
    catalogRepository,
    clock: handles.clock,
    consentVersions: STORE_CONSENT_VERSIONS,
    deliveryService: createStoreDeliveryService(handles.productEmail, {
      appBasePath: handles.appBasePath,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
    logger: handles.logger,
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
    acquisitions: new StoreAcquisitionController(
      acquisitionService,
      handles.botVerifier,
    ),
    catalog: new StoreCatalogController({
      appBasePath: handles.appBasePath,
      findPublishedProduct,
      listPublishedProducts,
    }),
    covers: new StoreCoverAssetController({
      assetStore,
      findPublishedCover,
    }),
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
