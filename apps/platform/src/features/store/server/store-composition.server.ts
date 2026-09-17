import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  AcquireProductsUseCase,
  type AcquisitionIncidents,
} from "@eli-coach-platform/domain/acquisition";
import { ResolveDownloadGrantUseCase } from "@eli-coach-platform/domain/download-grant";
import {
  FindPublishedCoverUseCase,
  FindPublishedProductUseCase,
  ListPublishedProductsUseCase,
  PlanNewProductUseCase,
  PlanProductRevisionUseCase,
  PublishNewProductUseCase,
  PublishProductVersionUseCase,
  RetireProductUseCase,
} from "@eli-coach-platform/domain/product";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  PRIVACY_POLICY_VERSION,
  STORE_MARKETING_CONSENT_VERSION,
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
} from "@eli-coach-platform/content";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import type {
  ManagementAuthenticator,
  ManagementAuthConfig,
} from "@eli-coach-platform/infrastructure/management-auth/server";

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
import { createProductDelivery } from "~/features/store/email/create-product-delivery.server";

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
  logger: AcquisitionIncidents;
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
  const acquireProducts = new AcquireProductsUseCase({
    acquisitions: new PostgresStoreAcquisitionRepository(handles.database),
    catalog: catalogRepository,
    clock: handles.clock,
    consentVersions: STORE_CONSENT_VERSIONS,
    delivery: createProductDelivery(handles.productEmail, {
      appBasePath: handles.appBasePath,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
    incidents: handles.logger,
    payloadDigestGenerator: new PayloadSha256Digest(),
    tokenGenerator: new RandomDownloadTokenGenerator(),
  });
  const planOptions = {
    digest: new ProductAssetSha256Digest(),
    publications: new PostgresStoreProductPublicationRepository(
      handles.database,
    ),
  };
  const publishOptions = { assetWriter: assetStore, ...planOptions };
  const resolveDownloadGrant = new ResolveDownloadGrantUseCase({
    clock: handles.clock,
    downloadGrants: new PostgresDownloadGrantRepository(handles.database),
    tokenHasher: new DownloadTokenSha256(),
  });

  return {
    acquisitions: new StoreAcquisitionController(
      acquireProducts,
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
    downloads: new StoreDownloadController(resolveDownloadGrant, assetStore, {
      appBasePath: handles.appBasePath,
      zipDeliveryStream: new ZipDeliveryStream(assetStore),
    }),
    management: new StoreProductManagementController({
      authConfig: handles.managementAuth.config,
      authenticator: handles.managementAuth.authenticator,
      planNewProduct: new PlanNewProductUseCase(planOptions),
      planProductRevision: new PlanProductRevisionUseCase(planOptions),
      publishNewProduct: new PublishNewProductUseCase(publishOptions),
      publishProductVersion: new PublishProductVersionUseCase(publishOptions),
      retireProduct: new RetireProductUseCase({
        publications: planOptions.publications,
      }),
    }),
  };
}
