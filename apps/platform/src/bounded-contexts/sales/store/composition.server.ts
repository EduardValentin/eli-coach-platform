import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork } from "~/shared/database/index.server";
import type { PaymentProvider } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-provider.server";
import type { PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-completion-handler-port.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import { PostgresPaymentEventLedgerRepository } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/persistence/postgres-payment-event-ledger-repository.server";
import { AcquireProductsUseCase } from "~/bounded-contexts/sales/store/domain/acquisition";
import { ResolveDownloadGrantUseCase } from "~/bounded-contexts/sales/store/domain/download-grant";
import {
  CompleteOrderUseCase,
  DeliverOrderEmailUseCase,
  PlaceOrderUseCase,
  PrepareOrderEmailResendUseCase,
  ReadOrderConfirmationUseCase,
  RefundOrderUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import type { EmailAcceptancePort } from "~/bounded-contexts/sales/store/domain/email-acceptance-port";
import {
  ChangeProductPriceUseCase,
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
import type { ApiKeyAccountsFacade } from "~/bounded-contexts/access/public/api-key-accounts-facade";
import type { BotVerifierPort } from "~/shared/submission-checks/bot-detection/index.server";
import type { ProductEmailPort } from "~/shared/email/index.server";
import type {
  ManagementAuthenticatorPort,
  ManagementAuthConfig,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-port.server";

import { StoreAcquisitionController } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/store-acquisition-controller.server";
import { StoreCheckoutController } from "~/bounded-contexts/sales/store/adapters/inbound/http/checkouts/store-checkout-controller.server";
import { StoreOrderController } from "~/bounded-contexts/sales/store/adapters/inbound/http/orders/store-order-controller.server";
import { StoreOrderCompletionHandler } from "~/bounded-contexts/sales/store/adapters/inbound/http/payments/store-order-completion-handler.server";
import { StoreOrderRefundHandler } from "~/bounded-contexts/sales/store/adapters/inbound/http/payments/store-order-refund-handler.server";
import { PostgresStoreOrderRepository } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/orders/postgres-store-order-repository.server";
import { RandomOrderIdsAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/persistence/orders/random-order-ids-adapter.server";
import { createStoreCheckoutAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/payments/create-store-checkout-adapter.server";
import { EmailOrderDeliveryAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/email/email-order-delivery-adapter.server";
import { LegalOrderTermsAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/legal/legal-order-terms-adapter.server";
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
import { ApiKeyManagementAuthenticatorAdapter } from "~/bounded-contexts/sales/store/adapters/outbound/access/api-key-management-authenticator-adapter.server";

type ManagementAuth = {
  managementAuthenticatorPort: ManagementAuthenticatorPort;
  config: ManagementAuthConfig;
};

export type StoreFeatureHandles = {
  appBasePath: string;
  botVerifierPort: BotVerifierPort;
  clockPort: ClockPort;
  contactEmail: string;
  database: DatabaseClient;
  emailAcceptancePort: EmailAcceptancePort;
  loggerPort: LoggerPort;
  managementAuth: ManagementAuth;
  paymentProvider: PaymentProvider;
  productEmailPort: ProductEmailPort;
  publicAppUrl: string;
  storeAssetRoot: string;
  termsFacade: TermsFacade;
};

type StoreComposition = {
  feature: StoreFeature;
  paymentHandlers: {
    paymentCompletionHandlerPort: PaymentCompletionHandlerPort;
    paymentRefundHandlerPort: PaymentRefundHandlerPort;
  };
};

export function composeStoreFeature(
  handles: StoreFeatureHandles,
): StoreComposition {
  const storeIncidentsAdapter = new StoreIncidentsAdapter(handles.loggerPort);
  const postgresStoreCatalogRepository = new PostgresStoreCatalogRepository(
    handles.database,
  );
  const listPublishedProductsUseCase = new ListPublishedProductsUseCase({
    storeCatalogPort: postgresStoreCatalogRepository,
  });
  const findPublishedProductUseCase = new FindPublishedProductUseCase({
    storeCatalogPort: postgresStoreCatalogRepository,
  });
  const findPublishedCoverUseCase = new FindPublishedCoverUseCase({
    storeCatalogPort: postgresStoreCatalogRepository,
  });
  const filesystemProductAssetStoreAdapter =
    new FilesystemProductAssetStoreAdapter(handles.storeAssetRoot);
  filesystemProductAssetStoreAdapter.assertReadyAtStartup();
  const acquireProductsUseCase = new AcquireProductsUseCase({
    storeAcquisitionsPort: new PostgresStoreAcquisitionRepository(
      handles.database,
    ),
    storeCatalogPort: postgresStoreCatalogRepository,
    clockPort: handles.clockPort,
    consentVersionsPort: new LegalConsentVersionsAdapter(handles.termsFacade),
    productDeliveryPort: createProductDeliveryAdapter(
      handles.productEmailPort,
      {
        appBasePath: handles.appBasePath,
        contactEmail: handles.contactEmail,
        publicAppUrl: handles.publicAppUrl,
      },
    ),
    emailAcceptancePort: handles.emailAcceptancePort,
    acquisitionIncidentsPort: storeIncidentsAdapter,
    payloadDigestGeneratorPort: new PayloadSha256DigestAdapter(),
    downloadTokenGeneratorPort: new RandomDownloadTokenGeneratorAdapter(),
  });
  const postgresStoreOrderRepository = new PostgresStoreOrderRepository(
    handles.database,
  );
  const storeCheckoutPort = createStoreCheckoutAdapter(handles.paymentProvider);
  const emailOrderDeliveryAdapter = new EmailOrderDeliveryAdapter(
    handles.productEmailPort,
    {
      appBasePath: handles.appBasePath,
      contactEmail: handles.contactEmail,
      publicAppUrl: handles.publicAppUrl,
    },
  );
  const orderEmailAttemptDependencies = {
    clockPort: handles.clockPort,
    downloadTokenGeneratorPort: new RandomDownloadTokenGeneratorAdapter(),
    orderDeliveryPort: emailOrderDeliveryAdapter,
    storeOrdersPort: postgresStoreOrderRepository,
  };
  const deliverOrderEmailUseCase = new DeliverOrderEmailUseCase({
    storeOrdersPort: postgresStoreOrderRepository,
    orderDeliveryPort: emailOrderDeliveryAdapter,
    orderTermsPort: new LegalOrderTermsAdapter(handles.termsFacade),
    orderIncidentsPort: storeIncidentsAdapter,
  });
  const planOptions = {
    productAssetDigestPort: new ProductAssetSha256DigestAdapter(),
    storeProductPublicationsPort: new PostgresStoreProductPublicationRepository(
      handles.database,
    ),
  };
  const publishOptions = {
    productAssetWriterPort: filesystemProductAssetStoreAdapter,
    ...planOptions,
  };
  const postgresDownloadGrantRepository = new PostgresDownloadGrantRepository(
    handles.database,
  );
  const postgresPaymentEventLedgerRepository =
    new PostgresPaymentEventLedgerRepository(handles.database);
  const resolveDownloadGrantUseCase = new ResolveDownloadGrantUseCase({
    clockPort: handles.clockPort,
    downloadGrantsPort: postgresDownloadGrantRepository,
    downloadTokenHasherPort: new DownloadTokenSha256Adapter(),
  });

  const feature: StoreFeature = {
    storeAcquisitionController: new StoreAcquisitionController(
      acquireProductsUseCase,
      handles.botVerifierPort,
    ),
    storeCatalogController: new StoreCatalogController({
      appBasePath: handles.appBasePath,
      findPublishedProductUseCase,
      listPublishedProductsUseCase,
    }),
    storeCheckoutController: new StoreCheckoutController({
      appBasePath: handles.appBasePath,
      botVerifierPort: handles.botVerifierPort,
      placeOrderUseCase: new PlaceOrderUseCase({
        storeOrdersPort: postgresStoreOrderRepository,
        storeCatalogPort: postgresStoreCatalogRepository,
        storeCheckoutPort,
        clockPort: handles.clockPort,
        consentVersionsPort: new LegalConsentVersionsAdapter(
          handles.termsFacade,
        ),
        emailAcceptancePort: handles.emailAcceptancePort,
        payloadDigestGeneratorPort: new PayloadSha256DigestAdapter(),
        orderIdsPort: new RandomOrderIdsAdapter(),
      }),
      publicAppUrl: handles.publicAppUrl,
    }),
    storeOrderController: new StoreOrderController({
      readOrderConfirmationUseCase: new ReadOrderConfirmationUseCase({
        storeOrdersPort: postgresStoreOrderRepository,
        storeCheckoutPort,
      }),
      prepareOrderEmailResendUseCase: new PrepareOrderEmailResendUseCase(
        orderEmailAttemptDependencies,
      ),
      deliverOrderEmailUseCase,
    }),
    storeCoverAssetController: new StoreCoverAssetController({
      productAssetsPort: filesystemProductAssetStoreAdapter,
      findPublishedCoverUseCase,
    }),
    storeDownloadController: new StoreDownloadController(
      resolveDownloadGrantUseCase,
      filesystemProductAssetStoreAdapter,
      {
        appBasePath: handles.appBasePath,
        zipDeliveryStream: new ZipDeliveryStream(
          filesystemProductAssetStoreAdapter,
        ),
      },
    ),
    storeProductManagementController: new StoreProductManagementController({
      authConfig: handles.managementAuth.config,
      changeProductPriceUseCase: new ChangeProductPriceUseCase(planOptions),
      managementAuthenticatorPort:
        handles.managementAuth.managementAuthenticatorPort,
      planNewProductUseCase: new PlanNewProductUseCase(planOptions),
      planProductRevisionUseCase: new PlanProductRevisionUseCase(planOptions),
      publishNewProductUseCase: new PublishNewProductUseCase(publishOptions),
      publishProductVersionUseCase: new PublishProductVersionUseCase(
        publishOptions,
      ),
      retireProductUseCase: new RetireProductUseCase({
        storeProductPublicationsPort: planOptions.storeProductPublicationsPort,
      }),
    }),
  };

  return {
    feature,
    paymentHandlers: {
      paymentCompletionHandlerPort: new StoreOrderCompletionHandler({
        completeOrderUseCase: new CompleteOrderUseCase({
          ...orderEmailAttemptDependencies,
          paymentEventLedgerPort: postgresPaymentEventLedgerRepository,
          orderIncidentsPort: storeIncidentsAdapter,
        }),
        deliverOrderEmailUseCase,
        unitOfWork: createUnitOfWork(handles.database),
      }),
      paymentRefundHandlerPort: new StoreOrderRefundHandler({
        refundOrderUseCase: new RefundOrderUseCase({
          storeOrdersPort: postgresStoreOrderRepository,
          downloadGrantsPort: postgresDownloadGrantRepository,
          paymentEventLedgerPort: postgresPaymentEventLedgerRepository,
          orderIncidentsPort: storeIncidentsAdapter,
          clockPort: handles.clockPort,
        }),
      }),
    },
  };
}

export function composeManagementAuth(handles: {
  apiKeyAccountsFacade: ApiKeyAccountsFacade;
  publicAppUrl: string;
}): ManagementAuth {
  return {
    managementAuthenticatorPort: new ApiKeyManagementAuthenticatorAdapter(
      handles.apiKeyAccountsFacade,
    ),
    config: createManagementAuthConfig(handles.publicAppUrl),
  };
}
