import type { PublishedProduct, StoreCatalog } from "../product";
import type { Clock, Logger } from "../shared";

import {
  AcquisitionRequest,
  STORE_DELIVERY_LIMIT_POLICY,
  type AcquireProductsCommand,
  type StoreDeliveryLimitWindow,
} from "./acquisition";
import type {
  DownloadTokenGenerator,
  PayloadDigestGenerator,
  ProductDelivery,
  ProductDeliveryResult,
} from "./product-delivery";
import type {
  ResolvedPriorAcquisition,
  StoreAcquisitions,
} from "./store-acquisitions";

type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export type AcquireProductsResult =
  | { status: "delivered" }
  | { status: "delivery_unavailable" }
  | { status: "delivery_retryable" }
  | { status: "idempotency_conflict" }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | {
      status: "rate_limited";
      window: StoreDeliveryLimitWindow;
    };

type AcquireProductsUseCaseOptions = {
  acquisitions: StoreAcquisitions;
  catalog: StoreCatalog;
  clock: Clock;
  consentVersions: StoreConsentVersions;
  delivery: ProductDelivery;
  logger: Logger;
  payloadDigestGenerator: PayloadDigestGenerator;
  tokenGenerator: DownloadTokenGenerator;
};

export class AcquireProductsUseCase {
  constructor(private readonly options: AcquireProductsUseCaseOptions) {}

  async execute(
    command: AcquireProductsCommand,
  ): Promise<AcquireProductsResult> {
    const request = AcquisitionRequest.from(command, this.options.clock.now());
    const payloadDigest = this.options.payloadDigestGenerator.digest(
      request.canonicalPayload(),
    );
    const priorOutcome = await this.options.acquisitions.resolveIdempotency({
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
    const token = this.options.tokenGenerator.create();
    const providerIdempotencyKey =
      this.options.delivery.createProviderIdempotencyKey(
        request.idempotencyKey,
      );
    const preparation = await this.options.acquisitions.prepareAcquisition({
      cooldownSince: request.windows.cooldownSince,
      dailyLimit: STORE_DELIVERY_LIMIT_POLICY.dailyLimit,
      dailyWindowSince: request.windows.dailyWindowSince,
      deliveryLimitKey: request.email.deliveryLimitKey,
      deliveryProvider: this.options.delivery.provider,
      expiresAt: request.windows.expiresAt,
      idempotencyKey: request.idempotencyKey,
      marketingConsent: request.marketingConsent,
      marketingConsentedAt: request.marketingConsent
        ? request.requestedAt
        : null,
      marketingConsentVersion:
        this.options.consentVersions.marketingConsentVersion,
      normalizedEmail: request.email.value,
      payloadDigest,
      privacyPolicyVersion: this.options.consentVersions.privacyPolicyVersion,
      products,
      providerIdempotencyKey,
      requestedAt: request.requestedAt,
      termsVersion: this.options.consentVersions.termsVersion,
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
      email: request.email.value,
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

    if (outcome.expiresAt.getTime() <= this.options.clock.now().getTime()) {
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
      delivery = await this.options.delivery.deliver(
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
    this.options.logger.error("Store delivery provider rejected the request.", {
      errorCategory: "store_delivery_rejected",
      providerRejectionReason: reason,
      requestId: command.requestId,
    });

    try {
      await this.options.acquisitions.recordDeliveryRejected({
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
      await this.options.acquisitions.recordDeliveryRetryable({
        deliveryAttemptId: command.deliveryAttemptId,
        requestId: command.requestId,
      });
    } catch {
      this.options.logger.error(
        "Store retryable delivery audit requires reconciliation.",
        {
          errorCategory: "store_delivery_retryable_audit_pending",
          requestId: command.requestId,
        },
      );
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
      await this.options.acquisitions.recordDeliveryAccepted({
        deliveryAttemptId: command.deliveryAttemptId,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        requestId: command.requestId,
      });
    } catch {
      this.options.logger.error(
        "Store delivery acceptance audit requires reconciliation.",
        {
          errorCategory: "store_delivery_acceptance_audit_pending",
          requestId: command.requestId,
        },
      );

      return { status: "delivery_retryable" };
    }

    return { status: "delivered" };
  }

  private async loadCatalog(): Promise<readonly PublishedProduct[] | null> {
    try {
      return await this.options.catalog.getPublishedCatalog();
    } catch {
      return null;
    }
  }
}

type ProductDeliveryCommand = Parameters<ProductDelivery["deliver"]>[0];

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
