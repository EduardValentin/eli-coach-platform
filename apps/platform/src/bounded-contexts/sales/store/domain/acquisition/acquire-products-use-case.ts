import type { PublishedProduct, StoreCatalogPort } from "../product";
import type { ClockPort } from "../clock-port";
import type { EmailAcceptancePort } from "../email-acceptance-port";

import {
  AcquisitionRequest,
  STORE_DELIVERY_LIMIT_POLICY,
  type AcquireProductsCommand,
  type StoreDeliveryLimitWindow,
} from "./acquisition";
import type { AcquisitionIncidentsPort } from "./acquisition-incidents-port";
import type { ConsentVersionsPort } from "./consent-versions-port";
import type {
  ProductDeliveryPort,
  ProductDeliveryResult,
} from "./product-delivery-port";
import type { PayloadDigestGeneratorPort } from "./payload-digest-generator-port";
import type { DownloadTokenGeneratorPort } from "./download-token-generator-port";
import type {
  ResolvedPriorAcquisition,
  StoreAcquisitionsPort,
} from "./store-acquisitions-port";

export type AcquireProductsResult =
  | { status: "delivered" }
  | { status: "delivery_unavailable" }
  | { status: "delivery_retryable" }
  | { status: "idempotency_conflict" }
  | { status: "subaddress_refused" }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | {
      status: "rate_limited";
      window: StoreDeliveryLimitWindow;
    };

type AcquireProductsUseCaseOptions = {
  storeAcquisitionsPort: StoreAcquisitionsPort;
  storeCatalogPort: StoreCatalogPort;
  clockPort: ClockPort;
  consentVersionsPort: ConsentVersionsPort;
  productDeliveryPort: ProductDeliveryPort;
  emailAcceptancePort: EmailAcceptancePort;
  acquisitionIncidentsPort: AcquisitionIncidentsPort;
  payloadDigestGeneratorPort: PayloadDigestGeneratorPort;
  downloadTokenGeneratorPort: DownloadTokenGeneratorPort;
};

export class AcquireProductsUseCase {
  constructor(private readonly options: AcquireProductsUseCaseOptions) {}

  async execute(
    command: AcquireProductsCommand,
  ): Promise<AcquireProductsResult> {
    const request = AcquisitionRequest.from(
      command,
      this.options.clockPort.now(),
      this.options.emailAcceptancePort,
    );

    if (!this.options.emailAcceptancePort.accepts(request.email)) {
      return { status: "subaddress_refused" };
    }

    const payloadDigest = this.options.payloadDigestGeneratorPort.digest(
      request.canonicalPayload(),
    );
    const priorOutcome =
      await this.options.storeAcquisitionsPort.resolveIdempotency({
        idempotencyKey: request.idempotencyKey,
        payloadDigest,
      });

    if (priorOutcome) {
      return this.resolvePriorOutcome(priorOutcome);
    }

    const catalog = await this.loadCatalog();

    if (catalog === null) {
      return { status: "delivery_retryable" };
    }

    const selection = request.selectProducts(catalog);

    if (selection.status === "unavailable_products") {
      return selection;
    }

    const products = selection.products;
    const token = this.options.downloadTokenGeneratorPort.create();
    const consentVersions = this.options.consentVersionsPort.current();
    const providerIdempotencyKey =
      this.options.productDeliveryPort.createProviderIdempotencyKey(
        request.idempotencyKey,
      );
    const preparation =
      await this.options.storeAcquisitionsPort.prepareAcquisition({
        cooldownSince: request.windows.cooldownSince,
        dailyLimit: STORE_DELIVERY_LIMIT_POLICY.dailyLimit,
        dailyWindowSince: request.windows.dailyWindowSince,
        deliveryLimitKey: request.deliveryLimitKey,
        deliveryProvider: this.options.productDeliveryPort.provider,
        expiresAt: request.windows.expiresAt,
        idempotencyKey: request.idempotencyKey,
        marketingConsent: request.marketingConsent,
        marketingConsentedAt: request.marketingConsent
          ? request.requestedAt
          : null,
        marketingConsentVersion: consentVersions.marketingConsentVersion,
        normalizedEmail: request.email,
        payloadDigest,
        privacyPolicyVersion: consentVersions.privacyPolicyVersion,
        products,
        providerIdempotencyKey,
        requestedAt: request.requestedAt,
        termsVersion: consentVersions.termsVersion,
        tokenSha256: token.sha256,
      });

    if (
      preparation.status === "unavailable_products" ||
      preparation.status === "rate_limited"
    ) {
      return preparation;
    }

    if (preparation.status !== "created") {
      return this.resolvePriorOutcome(preparation);
    }

    return this.sendCreatedDelivery({
      deliveryAttemptId: preparation.deliveryAttemptId,
      email: request.email,
      idempotencyKey: preparation.providerIdempotencyKey,
      provider: preparation.deliveryProvider,
      rawToken: token.rawToken,
      resources: products.map((product) => product.deliveryResource()),
      requestedAt: request.requestedAt,
      requestId: preparation.requestId,
    });
  }

  private async resolvePriorOutcome(
    outcome: ResolvedPriorAcquisition,
  ): Promise<AcquireProductsResult> {
    if (outcome.status === "idempotency_conflict") {
      return { status: "idempotency_conflict" };
    }

    if (outcome.deliveryStatus === "accepted") {
      return { status: "delivered" };
    }

    if (outcome.deliveryStatus === "rejected") {
      return { status: "delivery_unavailable" };
    }

    if (outcome.expiresAt.getTime() <= this.options.clockPort.now().getTime()) {
      return { status: "delivery_unavailable" };
    }

    return { status: "delivery_retryable" };
  }

  private async sendCreatedDelivery(
    command: AuditedProductDeliveryCommand,
  ): Promise<AcquireProductsResult> {
    let delivery: ProductDeliveryResult;

    /**
     * Whether an attempt that never reached a verdict may be retried is the
     * policy's call, not the adapter's: the adapter throws transport failures
     * and this use case treats them exactly as it treats an unconfirmed
     * verdict.
     */
    try {
      delivery = await this.options.productDeliveryPort.deliver(
        createProductDeliveryCommand(command),
      );
    } catch {
      return this.recordRetryableDelivery(command);
    }

    if (delivery.kind === "delivered") {
      return this.recordAcceptedDelivery(command, delivery);
    }

    if (delivery.kind === "rejected") {
      return this.recordRejectedDelivery(command, delivery.reason);
    }

    return this.recordRetryableDelivery(command);
  }

  private async recordRejectedDelivery(
    command: AuditedProductDeliveryCommand,
    reason: string,
  ): Promise<AcquireProductsResult> {
    this.options.acquisitionIncidentsPort.deliveryRejected({
      reason,
      requestId: command.requestId,
    });

    try {
      await this.options.storeAcquisitionsPort.recordDeliveryRejected({
        deliveryAttemptId: command.deliveryAttemptId,
        provider: command.provider,
        requestId: command.requestId,
      });
    } catch {
      return { status: "delivery_retryable" };
    }

    return { status: "delivery_unavailable" };
  }

  private async recordRetryableDelivery(
    command: AuditedProductDeliveryCommand,
  ): Promise<AcquireProductsResult> {
    try {
      await this.options.storeAcquisitionsPort.recordDeliveryRetryable({
        deliveryAttemptId: command.deliveryAttemptId,
        requestId: command.requestId,
      });
    } catch {
      this.options.acquisitionIncidentsPort.retryableDeliveryAuditPending({
        requestId: command.requestId,
      });
    }

    return { status: "delivery_retryable" };
  }

  private async recordAcceptedDelivery(
    command: AuditedProductDeliveryCommand,
    delivery: { provider: string; providerMessageId: string },
  ): Promise<AcquireProductsResult> {
    if (delivery.provider !== command.provider) {
      return this.recordRetryableDelivery(command);
    }

    try {
      await this.options.storeAcquisitionsPort.recordDeliveryAccepted({
        deliveryAttemptId: command.deliveryAttemptId,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        requestId: command.requestId,
      });
    } catch {
      this.options.acquisitionIncidentsPort.deliveryAcceptanceAuditPending({
        requestId: command.requestId,
      });

      return { status: "delivery_retryable" };
    }

    return { status: "delivered" };
  }

  private async loadCatalog(): Promise<readonly PublishedProduct[] | null> {
    try {
      return await this.options.storeCatalogPort.getPublishedCatalog();
    } catch {
      return null;
    }
  }
}

type ProductDeliveryCommand = Parameters<ProductDeliveryPort["deliver"]>[0];

type AuditedProductDeliveryCommand = ProductDeliveryCommand & {
  deliveryAttemptId: number;
  provider: string;
};

function createProductDeliveryCommand(
  command: AuditedProductDeliveryCommand,
): ProductDeliveryCommand {
  return {
    email: command.email,
    idempotencyKey: command.idempotencyKey,
    rawToken: command.rawToken,
    resources: command.resources,
    requestedAt: command.requestedAt,
    requestId: command.requestId,
  };
}
