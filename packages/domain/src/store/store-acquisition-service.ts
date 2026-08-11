import type { PublishedStoreProduct } from "./models";
import type { StoreCatalogRepository } from "./store-catalog-service";

const DOWNLOAD_GRANT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DELIVERY_COOLDOWN_MS = 60 * 1000;
const DELIVERY_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DELIVERY_DAILY_LIMIT = 5;

export type StoreDeliveryLimitWindow = "cooldown" | "daily";

export type StoreConsentVersions = {
  termsVersion: string;
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export type CreateDownloadTokenResult = {
  rawToken: string;
  sha256: string;
};

export interface DownloadTokenGenerator {
  create(): CreateDownloadTokenResult;
}

export interface PayloadDigestGenerator {
  digest(canonicalPayload: string): string;
}

export interface StoreClock {
  now(): Date;
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

export interface StoreAcquisitionRepository {
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
  }): Promise<{
    provider: string;
    providerMessageId: string;
  }>;
}

export type StoreDeliveryResource = {
  title: string;
  typeLabels: readonly string[];
};

export class StoreDeliveryRejectedError extends Error {
  constructor() {
    super("Store delivery provider rejected the request.");
    this.name = "StoreDeliveryRejectedError";
  }
}

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
  acquisitionRepository: StoreAcquisitionRepository;
  catalogRepository: StoreCatalogRepository;
  clock: StoreClock;
  consentVersions: StoreConsentVersions;
  deliveryService: StoreDeliveryService;
  payloadDigestGenerator: PayloadDigestGenerator;
  tokenGenerator: DownloadTokenGenerator;
};

export class StoreAcquisitionService {
  constructor(private readonly options: StoreAcquisitionServiceOptions) {}

  async acquire(
    command: AcquireStoreProductsCommand,
  ): Promise<StoreAcquisitionResult> {
    const normalizedEmail = normalizeStoreEmail(command.email);
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

    const products = availableProductSlugs.map(
      (slug) => productsBySlug.get(slug)!,
    );
    const requestedAt = this.options.clock.now();
    const expiresAt = new Date(
      requestedAt.getTime() + DOWNLOAD_GRANT_DURATION_MS,
    );
    const token = this.options.tokenGenerator.create();
    const providerIdempotencyKey =
      this.options.deliveryService.createProviderIdempotencyKey(
        command.idempotencyKey,
      );
    const preparation =
      await this.options.acquisitionRepository.prepareAcquisition({
        cooldownSince: new Date(
          requestedAt.getTime() - DELIVERY_COOLDOWN_MS,
        ),
        dailyLimit: DELIVERY_DAILY_LIMIT,
        dailyWindowSince: new Date(
          requestedAt.getTime() - DELIVERY_DAILY_WINDOW_MS,
        ),
        deliveryProvider: this.options.deliveryService.provider,
        expiresAt,
        idempotencyKey: command.idempotencyKey,
        marketingConsent: command.marketingConsent,
        marketingConsentedAt: command.marketingConsent ? requestedAt : null,
        marketingConsentVersion:
          this.options.consentVersions.marketingConsentVersion,
        normalizedEmail,
        payloadDigest,
        privacyPolicyVersion:
          this.options.consentVersions.privacyPolicyVersion,
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
    let delivery: Awaited<
      ReturnType<StoreDeliveryService["deliver"]>
    >;

    try {
      delivery = await this.options.deliveryService.deliver(
        createStoreDeliveryCommand(command),
      );
    } catch (error) {
      return this.resolveDeliveryFailure(error, command);
    }

    return this.recordAcceptedDelivery(command, delivery);
  }

  private async resolveDeliveryFailure(
    error: unknown,
    command: AuditedStoreDeliveryCommand,
  ): Promise<StoreAcquisitionResult> {
    if (!(error instanceof StoreDeliveryRejectedError)) {
      try {
        await this.options.acquisitionRepository.recordDeliveryRetryable({
          deliveryAttemptId: command.deliveryAttemptId,
          requestId: command.requestId,
        });
      } catch {
        console.error(
          "Store retryable delivery audit requires reconciliation.",
          {
            errorCategory: "store_delivery_retryable_audit_pending",
            requestId: command.requestId,
          },
        );
      }

      return { status: "delivery_retryable" };
    }

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

  private async recordAcceptedDelivery(
    command: AuditedStoreDeliveryCommand,
    delivery: Awaited<
      ReturnType<StoreDeliveryService["deliver"]>
    >,
  ): Promise<StoreAcquisitionResult> {
    if (delivery.provider !== command.provider) {
      return this.resolveDeliveryFailure(
        new Error("Store delivery provider identity changed."),
        command,
      );
    }

    try {
      await this.options.acquisitionRepository.recordDeliveryAccepted({
        deliveryAttemptId: command.deliveryAttemptId,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        requestId: command.requestId,
      });
    } catch {
      console.error(
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

  private async loadCatalog(): Promise<readonly PublishedStoreProduct[] | null> {
    try {
      return await this.options.catalogRepository.getPublishedCatalog();
    } catch {
      return null;
    }
  }
}

type StoreDeliveryCommand = Parameters<
  StoreDeliveryService["deliver"]
>[0];

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

function normalizeStoreEmail(email: string): string {
  return email.trim().toLowerCase();
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
