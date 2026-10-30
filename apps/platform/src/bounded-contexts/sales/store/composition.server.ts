import type { DatabaseClient } from "~/shared/database";
import { AcquireProductsUseCase } from "~/bounded-contexts/sales/store/domain/acquisition";
import { ResolveDownloadGrantUseCase } from "~/bounded-contexts/sales/store/domain/download-grant";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/store/domain/email-acceptance-port";
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
import type { ClockPort } from "~/bounded-contexts/sales/store/domain/clock-port";
import type { TermsFacade } from "~/bounded-contexts/legal/public";
import type { BotVerifierPort } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmailPort } from "~/shared/email/index.server";
import type {
  ManagementAuthenticatorPort,
  ManagementAuthConfig,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-port.server";

import { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/store-acquisition-controller.server";
import { StoreCatalogController } from "~/bounded-contexts/sales/store/adapters/inbound/http/catalog/store-catalog-controller.server";
import { StoreCoverAssetController } from "~/bounded-contexts/sales/store/adapters/inbound/http/covers/store-cover-asset-controller.server";
import { StoreDownloadController } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/store-download-controller.server";
import { StoreProductManagementController } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/store-product-management-controller.server";
import { ZipDeliveryStream } from "~/bounded-contexts/sales/store/adapters/inbound/http/downloads/zip-stream.server";
import { PostgresStoreAcquisitionRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/acquisitions/postgres-store-acquisition-repository.server";
import { ProductAssetSha256DigestAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/assets/product-asset-sha256-digest-adapter.server";
import { FilesystemProductAssetStoreAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/assets/filesystem-product-asset-store-adapter.server";
import { PostgresStoreCatalogRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/catalog/postgres-store-catalog-repository.server";
import { PostgresDownloadGrantRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/download-grants/postgres-download-grant-repository.server";
import { RandomDownloadTokenGeneratorAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/download-grants/random-download-token-generator-adapter.server";
import { PayloadSha256DigestAdapter } from "./adapters/outbound/persistence/download-grants/payload-sha256-digest-adapter.server";
import { DownloadTokenSha256Adapter } from "./adapters/outbound/persistence/download-grants/download-token-sha256-adapter.server";
import { PostgresStoreProductPublicationRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/publications/postgres-store-product-publication-repository.server";
import { createProductDeliveryAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/email/create-product-delivery-adapter.server";
import type { StoreFeature } from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { StoreIncidentsAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/logging/store-incidents-adapter.server";
import { LegalConsentVersionsAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/legal/legal-consent-versions-adapter.server";
import { createManagementAuthConfig } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-auth-config.server";
import { createManagementAuthenticator } from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/create-management-authenticator.server";
import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";

type ManagementAuth = {
  authenticator: ManagementAuthenticatorPort;
  config: ManagementAuthConfig;
};

export type StoreFeatureHandles = {
  appBasePath: string;
  botVerifier: BotVerifierPort;
  clock: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptance: EmailAcceptancePort;
  logger: LoggerPort;
  managementAuth: ManagementAuth;
  productEmail: ProductEmailPort;
  publicAppUrl: string;
  storeAssetRoot: string;
  terms: TermsFacade;
};

export function composeStoreFeature(
  handles: StoreFeatureHandles,
): StoreFeature {
  const incidents = new StoreIncidentsAdapter(handles.logger);
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
  const assetStore = new FilesystemProductAssetStoreAdapter(
    handles.storeAssetRoot,
  );
  assetStore.assertReadyAtStartup();
  const acquireProducts = new AcquireProductsUseCase({
    acquisitions: new PostgresStoreAcquisitionRepository(handles.database),
    catalog: catalogRepository,
    clock: handles.clock,
    consentVersions: new LegalConsentVersionsAdapter(handles.terms),
    delivery: createProductDeliveryAdapter(handles.productEmail, {
      appBasePath: handles.appBasePath,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    }),
    emailAcceptance: handles.emailAcceptance,
    incidents,
    payloadDigestGenerator: new PayloadSha256DigestAdapter(),
    tokenGenerator: new RandomDownloadTokenGeneratorAdapter(),
  });
  const planOptions = {
    digest: new ProductAssetSha256DigestAdapter(),
    publications: new PostgresStoreProductPublicationRepository(
      handles.database,
    ),
  };
  const publishOptions = { assetWriter: assetStore, ...planOptions };
  const resolveDownloadGrant = new ResolveDownloadGrantUseCase({
    clock: handles.clock,
    downloadGrants: new PostgresDownloadGrantRepository(handles.database),
    tokenHasher: new DownloadTokenSha256Adapter(),
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

export function composeManagementAuth(site: {
  managementApiConfig: ManagementApiConfig;
  publicAppUrl: string;
}): ManagementAuth {
  return {
    authenticator: createManagementAuthenticator(site.managementApiConfig),
    config: createManagementAuthConfig(site.managementApiConfig, {
      PUBLIC_APP_URL: site.publicAppUrl,
    }),
  };
}
