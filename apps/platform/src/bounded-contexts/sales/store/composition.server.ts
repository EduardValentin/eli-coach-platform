import type { DatabaseClient } from "~/shared/database";
import { AcquireProductsUseCase } from "~/bounded-contexts/sales/store/domain/acquisition";
import { ResolveDownloadGrantUseCase } from "~/bounded-contexts/sales/store/domain/download-grant";
import type { EmailAcceptance } from "~/bounded-contexts/sales/store/domain/email-acceptance";
import {
  FindPublishedCoverUseCase,
  FindPublishedProductUseCase,
  ListPublishedProductsUseCase,
  PlanNewProductUseCase,
  PlanProductRevisionUseCase,
  PublishNewProductUseCase,
  PublishProductVersionUseCase,
  RetireProductUseCase,
} from "~/bounded-contexts/sales/store/domain/product";
import type { Clock } from "~/bounded-contexts/sales/store/domain/clock";
import type { TermsFacade } from "~/bounded-contexts/legal/public";
import type { BotVerifier } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmail } from "~/shared/email/index.server";
import type {
  ManagementAuthenticator,
  ManagementAuthConfig,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-contract.server";

import { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/acquisitions-controller.server";
import { StoreCatalogController } from "~/bounded-contexts/sales/store/adapters/inbound/http/catalog/catalog-controller.server";
import { StoreCoverAssetController } from "~/bounded-contexts/sales/store/adapters/inbound/http/covers/covers-controller.server";
import { StoreDownloadController } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/downloads-controller.server";
import { StoreProductManagementController } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-controller.server";
import { ZipDeliveryStream } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/zip-stream.server";
import { PostgresStoreAcquisitionRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/acquisitions/acquisition-repository.server";
import { ProductAssetSha256Digest } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/assets/asset-digest.server";
import { FilesystemProductAssetStore } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/assets/asset-store.server";
import { PostgresStoreCatalogRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/catalog/catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/download-grants/download-grant-repository.server";
import {
  DownloadTokenSha256,
  PayloadSha256Digest,
  RandomDownloadTokenGenerator,
} from "~/bounded-contexts/sales/store/adapters/outbound/persistence/download-grants/download-token.server";
import { PostgresStoreProductPublicationRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/publications/publication-repository.server";
import { createProductDelivery } from "~/bounded-contexts/sales/store/adapters/outbound/email/create-product-delivery.server";
import type { StoreFeature } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createStoreIncidents } from "~/bounded-contexts/sales/store/adapters/outbound/logging/store-incidents.server";
import { LegalConsentVersions } from "~/bounded-contexts/sales/store/adapters/outbound/legal/consent-versions.server";

export type StoreFeatureHandles = {
  appBasePath: string;
  botVerifier: BotVerifier;
  clock: Clock;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptance;
  logger: Logger;
  managementAuth: {
    authenticator: ManagementAuthenticator;
    config: ManagementAuthConfig;
  };
  productEmail: ProductEmail;
  publicAppUrl: string;
  storeAssetRoot: string;
  terms: TermsFacade;
};

export function composeStoreFeature(
  handles: StoreFeatureHandles,
): StoreFeature {
  const incidents = createStoreIncidents(handles.logger);
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
    consentVersions: new LegalConsentVersions(handles.terms),
    delivery: createProductDelivery(handles.productEmail, {
      appBasePath: handles.appBasePath,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
    emailAcceptance: handles.emailAcceptance,
    incidents,
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
