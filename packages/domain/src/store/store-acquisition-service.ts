import { normalizeEmail } from "../email-address";
import type { Clock, Logger } from "../shared";

import { resolveDeliveryLimitKey } from "./delivery-limit-key";
import {
  resolveDeliveryWindows,
  STORE_DELIVERY_LIMIT_POLICY,
  type StoreDeliveryLimitWindow,
} from "./delivery-limits";
import type { PublishedStoreProduct } from "./models";
import type { StoreCatalog } from "./store-catalog-service";

type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export type CreateDownloadTokenResult = {
  rawToken: string;
  sha256: string;
};

interface DownloadTokenGenerator {
  create(): CreateDownloadTokenResult;
}

export interface PayloadDigestGenerator {
  digest(canonicalPayload: string): string;
}

export type PrepareAcquisitionCommand = {
  normalizedEmail: string;
  idempotencyKey: string;
  payloadDigest: string;
  products: readonly PublishedStoreProduct[];
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
  marketingConsent: boolean;
  marketingConsentedAt: Date | null;
  requestedAt: Date;
  expiresAt: Date;
  tokenSha256: string;
  deliveryProvider: string;
  providerIdempotencyKey: string;
  cooldownSince: Date;
  dailyWindowSince: Date;
  dailyLimit: number;
  deliveryLimitKey: string;
};

export type AcquisitionPreparation =
  | {
      status: "created";
      deliveryAttemptId: number;
      deliveryProvider: string;
      providerIdempotencyKey: string;
      requestId: number;
    }
  | {
      status: "replay";
      deliveryStatus: "pending" | "accepted" | "rejected";
      expiresAt: Date;
    }
  | {
      status: "idempotency_conflict";
    }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
  | {
      status: "rate_limited";
      window: StoreDeliveryLimitWindow;
    };

/**
 * A prior request resolved by idempotency key. Limit and availability outcomes
 * are decided per attempt, so they can never describe a stored request.
 */
export type ResolvedPriorAcquisition = Exclude<
  AcquisitionPreparation,
  { status: "created" | "rate_limited" | "unavailable_products" }
>;

export interface StoreAcquisitions {
  resolveIdempotency(command: {
    idempotencyKey: string;
    payloadDigest: string;
  }): Promise<ResolvedPriorAcquisition | null>;
  prepareAcquisition(
    command: PrepareAcquisitionCommand,
  ): Promise<AcquisitionPreparation>;
  recordDeliveryAccepted(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void>;
  recordDeliveryRejected(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
  }): Promise<void>;
  recordDeliveryRetryable(command: {
    deliveryAttemptId: number;
    requestId: number;
  }): Promise<void>;
}

export type StoreDeliveryResult =
  | { kind: "delivered"; provider: string; providerMessageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

export interface StoreDeliveryService {
  readonly provider: string;
  createProviderIdempotencyKey(applicationIdempotencyKey: string): string;
  deliver(command: {
    email: string;
    idempotencyKey: string;
    resources: readonly StoreDeliveryResource[];
    rawToken: string;
    requestedAt: Date;
    requestId: number;
  }): Promise<StoreDeliveryResult>;
}

type StoreDeliveryResource = {
  title: string;
  typeLabels: readonly string[];
};

export type AcquireStoreProductsCommand = {
  email: string;
  idempotencyKey: string;
  marketingConsent: boolean;
  productSlugs: readonly string[];
};

export type StoreAcquisitionResult =
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

type StoreAcquisitionServiceOptions = {
  acquisitionRepository: StoreAcquisitions;
  catalogRepository: StoreCatalog;
  clock: Clock;
  consentVersions: StoreConsentVersions;
  deliveryService: StoreDeliveryService;
  logger: Logger;
  payloadDigestGenerator: PayloadDigestGenerator;
  tokenGenerator: DownloadTokenGenerator;
};

export class StoreAcquisitionService {
  constructor(private readonly options: StoreAcquisitionServiceOptions) {}

  async acquire(
    command: AcquireStoreProductsCommand,
  ): Promise<StoreAcquisitionResult> {
    const normalizedEmail = normalizeEmail(command.email);
    const requestedProductSlugs = [...new Set(command.productSlugs)].sort();
    const payloadDigest = this.options.payloadDigestGenerator.digest(
      createCanonicalPayload({
        marketingConsent: command.marketingConsent,
        normalizedEmail,
        productSlugs: requestedProductSlugs,
      }),
    );
    const priorOutcome =
      await this.options.acquisitionRepository.resolveIdempotency({
        idempotencyKey: command.idempotencyKey,
        payloadDigest,
      });

    if (priorOutcome) {
      return this.resolvePriorOutcome(priorOutcome);
    }

    const catalog = await this.loadCatalog();

    if (catalog === null) {
      return { status: "delivery_retryable" };
    }

    const productsBySlug = new Map(
      catalog.map((product) => [product.slug, product]),
    );
    const availableProductSlugs = requestedProductSlugs.filter((slug) =>
      productsBySlug.has(slug),
    );

    if (availableProductSlugs.length !== requestedProductSlugs.length) {
      return {
        status: "unavailable_products",
        availableProductSlugs,
      };
    }

    const products = availableProductSlugs.map((slug) =>
      productsBySlug.get(slug)!,
    );
    const requestedAt = this.options.clock.now();
    const windows = resolveDeliveryWindows(
      requestedAt,
      STORE_DELIVERY_LIMIT_POLICY,
    );
    const expiresAt = windows.expiresAt;
    const token = this.options.tokenGenerator.create();
    const providerIdempotencyKey =
      this.options.deliveryService.createProviderIdempotencyKey(
        command.idempotencyKey,
      );
    const preparation =
      await this.options.acquisitionRepository.prepareAcquisition({
        cooldownSince: windows.cooldownSince,
        dailyLimit: STORE_DELIVERY_LIMIT_POLICY.dailyLimit,
        dailyWindowSince: windows.dailyWindowSince,
        deliveryLimitKey: resolveDeliveryLimitKey(normalizedEmail),
        deliveryProvider: this.options.deliveryService.provider,
        expiresAt,
        idempotencyKey: command.idempotencyKey,
        marketingConsent: command.marketingConsent,
        marketingConsentedAt: command.marketingConsent ? requestedAt : null,
        marketingConsentVersion:
          this.options.consentVersions.marketingConsentVersion,
        normalizedEmail,
        payloadDigest,
        privacyPolicyVersion: this.options.consentVersions.privacyPolicyVersion,
        products,
        providerIdempotencyKey,
        requestedAt,
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
      email: normalizedEmail,
      idempotencyKey: preparation.providerIdempotencyKey,
      provider: preparation.deliveryProvider,
      rawToken: token.rawToken,
      resources: products.map((product) => ({
        title: product.version.title,
        typeLabels: product.version.types.map((type) => type.label),
      })),
      requestedAt,
      requestId: preparation.requestId,
    });
  }

  private async resolvePriorOutcome(
    outcome: ResolvedPriorAcquisition,
  ): Promise<StoreAcquisitionResult> {
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
    command: AuditedStoreDeliveryCommand,
  ): Promise<StoreAcquisitionResult> {
    let delivery: StoreDeliveryResult;

    /**
     * Whether an attempt that never reached a verdict may be retried is the
     * policy's call, not the adapter's: the adapter throws transport failures
     * and this service treats them exactly as it treats an unconfirmed
     * verdict.
     */
    try {
      delivery = await this.options.deliveryService.deliver(
        createStoreDeliveryCommand(command),
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
    command: AuditedStoreDeliveryCommand,
    reason: string,
  ): Promise<StoreAcquisitionResult> {
    this.options.logger.error("Store delivery provider rejected the request.", {
      errorCategory: "store_delivery_rejected",
      providerRejectionReason: reason,
      requestId: command.requestId,
    });

    try {
      await this.options.acquisitionRepository.recordDeliveryRejected({
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
    command: AuditedStoreDeliveryCommand,
  ): Promise<StoreAcquisitionResult> {
    try {
      await this.options.acquisitionRepository.recordDeliveryRetryable({
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
    command: AuditedStoreDeliveryCommand,
    delivery: { provider: string; providerMessageId: string },
  ): Promise<StoreAcquisitionResult> {
    if (delivery.provider !== command.provider) {
      return this.recordRetryableDelivery(command);
    }

    try {
      await this.options.acquisitionRepository.recordDeliveryAccepted({
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

  private async loadCatalog(): Promise<
    readonly PublishedStoreProduct[] | null
  > {
    try {
      return await this.options.catalogRepository.getPublishedCatalog();
    } catch {
      return null;
    }
  }
}

type StoreDeliveryCommand = Parameters<StoreDeliveryService["deliver"]>[0];

type AuditedStoreDeliveryCommand = StoreDeliveryCommand & {
  deliveryAttemptId: number;
  provider: string;
};

function createStoreDeliveryCommand(
  command: AuditedStoreDeliveryCommand,
): StoreDeliveryCommand {
  return {
    email: command.email,
    idempotencyKey: command.idempotencyKey,
    rawToken: command.rawToken,
    resources: command.resources,
    requestedAt: command.requestedAt,
    requestId: command.requestId,
  };
}

function createCanonicalPayload(options: {
  marketingConsent: boolean;
  normalizedEmail: string;
  productSlugs: readonly string[];
}): string {
  return JSON.stringify({
    email: options.normalizedEmail,
    marketingConsent: options.marketingConsent,
    productSlugs: options.productSlugs,
  });
}
