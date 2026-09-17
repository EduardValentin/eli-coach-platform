import { describe, expect, it, vi } from "vitest";

import { PublishedProduct, type StoreCatalog } from "../product";

import { AcquireProductsUseCase } from "./acquire-products-use-case";
import type { ProductDelivery } from "./product-delivery";
import type {
  AcquisitionPreparation,
  StoreAcquisitions,
} from "./store-acquisitions";

const fixedNow = new Date("2026-07-30T12:00:00.000Z");

function createLogger() {
  return { error: vi.fn() };
}

const product = PublishedProduct.reconstitute({
  id: 7,
  slug: "hormone-harmony",
  displayOrder: 1,
  version: {
    id: 11,
    sequence: 2,
    title: "Hormone Harmony",
    creatorName: "Evoa Fitness",
    cardSummary: "A practical cycle-aware guide.",
    detailDescription: "Learn how energy and recovery change across the cycle.",
    includedItems: ["Phase-by-phase guidance"],
    cover: {
      assetKey: "covers/hormone-harmony.webp",
      alt: "Hormone Harmony guide cover",
      mimeType: "image/webp",
      sizeBytes: 96,
      sha256: "c".repeat(64),
    },
    assets: [
      {
        assetKey: "products/hormone-harmony.pdf",
        customerFilename: "hormone-harmony.pdf",
        mimeType: "application/pdf",
        sizeBytes: 128,
        sha256: "a".repeat(64),
      },
    ],
    types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
    goals: [{ slug: "wellness", label: "Wellness", displayOrder: 3 }],
    publishedAt: new Date("2026-07-30T10:00:00.000Z"),
  },
});

function createCatalog(
  availableProducts: readonly PublishedProduct[] = [product],
): StoreCatalog {
  return {
    getPublishedCatalog: vi.fn().mockResolvedValue(availableProducts),
    getPublishedProductBySlug: vi.fn().mockResolvedValue(product),
    getPublishedCoverByAssetKey: vi.fn().mockResolvedValue(null),
  };
}

function createAcquisitions(
  preparation: AcquisitionPreparation = {
    deliveryAttemptId: 41,
    deliveryProvider: "resend",
    providerIdempotencyKey: createProviderIdempotencyKey(
      command.idempotencyKey,
    ),
    status: "created",
    requestId: 31,
  },
): StoreAcquisitions {
  return {
    prepareAcquisition: vi.fn().mockResolvedValue(preparation),
    recordDeliveryAccepted: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRejected: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRetryable: vi.fn().mockResolvedValue(undefined),
    resolveIdempotency: vi.fn().mockResolvedValue(null),
  };
}

function createDelivery(): ProductDelivery {
  return {
    createProviderIdempotencyKey,
    provider: "resend",
    deliver: vi.fn().mockResolvedValue({
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email-1",
    }),
  };
}

function createUseCase(options: {
  acquisitions?: StoreAcquisitions;
  catalog?: StoreCatalog;
  delivery?: ProductDelivery;
  logger?: ReturnType<typeof createLogger>;
}) {
  const events: string[] = [];
  const acquisitions = options.acquisitions ?? createAcquisitions();
  const delivery = options.delivery ?? createDelivery();
  const logger = options.logger ?? createLogger();
  const payloadDigestGenerator = {
    digest: vi.fn().mockReturnValue("payload-digest"),
  };

  vi.mocked(acquisitions.prepareAcquisition).mockImplementation(async () => {
    events.push("prepared");
    return {
      deliveryAttemptId: 41,
      deliveryProvider: delivery.provider,
      providerIdempotencyKey: delivery.createProviderIdempotencyKey(
        command.idempotencyKey,
      ),
      status: "created",
      requestId: 31,
    };
  });
  vi.mocked(delivery.deliver).mockImplementation(async () => {
    events.push("sent");
    return {
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email-1",
    };
  });
  vi.mocked(acquisitions.recordDeliveryAccepted).mockImplementation(
    async () => {
      events.push("accepted");
    },
  );

  return {
    acquisitions,
    delivery,
    events,
    logger,
    payloadDigestGenerator,
    acquireProducts: new AcquireProductsUseCase({
      acquisitions,
      catalog: options.catalog ?? createCatalog(),
      clock: { now: () => fixedNow },
      logger,
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      delivery,
      payloadDigestGenerator,
      tokenGenerator: {
        create: vi.fn().mockReturnValue({
          rawToken: "raw-token",
          sha256: "b".repeat(64),
        }),
      },
    }),
  };
}

const command = {
  email: "  WOMAN@Example.com ",
  idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
  marketingConsent: false,
  productSlugs: ["hormone-harmony"],
} as const;

function createProviderIdempotencyKey(
  applicationIdempotencyKey: string,
): string {
  return `store-acquisition-${applicationIdempotencyKey}`;
}

describe("AcquireProductsUseCase", () => {
  it("commits normalized acquisition and a seven-day grant before sending one email", async () => {
    // arrange
    const {
      acquireProducts,
      acquisitions,
      delivery,
      events,
      payloadDigestGenerator,
    } = createUseCase({});

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(events).toEqual(["prepared", "sent", "accepted"]);
    expect(acquisitions.prepareAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedEmail: "woman@example.com",
        expiresAt: new Date("2026-08-06T12:00:00.000Z"),
        products: [product],
        marketingConsent: false,
        marketingConsentedAt: null,
        providerIdempotencyKey: createProviderIdempotencyKey(
          command.idempotencyKey,
        ),
      }),
    );
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: createProviderIdempotencyKey(command.idempotencyKey),
        resources: [{ title: "Hormone Harmony", typeLabels: ["E-Books"] }],
      }),
    );
    expect(payloadDigestGenerator.digest).toHaveBeenCalledWith(
      JSON.stringify({
        email: "woman@example.com",
        marketingConsent: false,
        productSlugs: ["hormone-harmony"],
      }),
    );
  });

  it("rejects the whole request before persistence when any product is unavailable", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    const delivery = createDelivery();
    const { acquireProducts } = createUseCase({
      acquisitions,
      catalog: createCatalog([product]),
      delivery,
    });

    // act
    const result = await acquireProducts.execute({
      ...command,
      productSlugs: ["hormone-harmony", "removed-guide"],
    });

    // assert
    expect(result).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["hormone-harmony"],
    });
    expect(acquisitions.prepareAcquisition).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("replays a delivered technical request before reading the mutable catalog", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "accepted",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const delivery = createDelivery();
    const catalog = createCatalog();
    vi.mocked(catalog.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "unused",
        sha256: "b".repeat(64),
      }),
    };
    const acquireProducts = new AcquireProductsUseCase({
      acquisitions,
      catalog,
      clock: { now: () => fixedNow },
      logger: createLogger(),
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      delivery,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator,
    });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(catalog.getPublishedCatalog).not.toHaveBeenCalled();
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(acquisitions.prepareAcquisition).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(acquisitions.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("keeps catalog infrastructure failures retryable without preparing delivery", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    const catalog = createCatalog();
    vi.mocked(catalog.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const delivery = createDelivery();
    const { acquireProducts } = createUseCase({
      acquisitions,
      catalog,
      delivery,
    });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitions.prepareAcquisition).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous provider transport failure pending for an idempotent retry", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    const delivery = createDelivery();
    const setup = createUseCase({ acquisitions, delivery });
    vi.mocked(delivery.deliver).mockRejectedValue(
      new Error("provider unavailable"),
    );

    // act
    const result = await setup.acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitions.prepareAcquisition).toHaveBeenCalledTimes(1);
    expect(acquisitions.recordDeliveryRejected).not.toHaveBeenCalled();
  });

  it("records an ambiguous provider outcome before allowing a retry", async () => {
    // arrange
    const recordDeliveryRetryable = vi.fn().mockResolvedValue(undefined);
    const acquisitions = {
      ...createAcquisitions(),
      recordDeliveryRetryable,
    };
    const delivery = createDelivery();
    const setup = createUseCase({ acquisitions, delivery });
    vi.mocked(delivery.deliver).mockResolvedValue({ kind: "unconfirmed" });

    // act
    const result = await setup.acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(recordDeliveryRetryable).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
    });
  });

  it("does not resend a pending technical replay", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const delivery = createDelivery();
    const { acquireProducts } = createUseCase({ acquisitions, delivery });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("records a definitive provider rejection while preserving the committed acquisition", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    const delivery = createDelivery();
    const setup = createUseCase({ acquisitions, delivery });
    vi.mocked(delivery.deliver).mockResolvedValue({
      kind: "rejected",
      reason: "invalid_from_address",
    });

    // act
    const result = await setup.acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(acquisitions.recordDeliveryRejected).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
      provider: "resend",
    });
    expect(setup.logger.error).toHaveBeenCalledWith(
      "Store delivery provider rejected the request.",
      {
        errorCategory: "store_delivery_rejected",
        providerRejectionReason: "invalid_from_address",
        requestId: 31,
      },
    );
  });

  it("keeps the request retryable when an accepted delivery cannot be audited", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.recordDeliveryAccepted).mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const setup = createUseCase({ acquisitions });

    // act
    const result = await setup.acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitions.recordDeliveryRejected).not.toHaveBeenCalled();
    expect(setup.logger.error).toHaveBeenCalledWith(
      "Store delivery acceptance audit requires reconciliation.",
      {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId: 31,
      },
    );
  });

  it("does not resend when accepted delivery audit remains pending", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const delivery = createDelivery();
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "stable-raw-token",
        sha256: "b".repeat(64),
      }),
    };
    const acquireProducts = new AcquireProductsUseCase({
      acquisitions,
      catalog: createCatalog([]),
      clock: { now: () => fixedNow },
      logger: createLogger(),
      consentVersions: {
        marketingConsentVersion: "2.0",
        privacyPolicyVersion: "3.0",
        termsVersion: "2.0",
      },
      delivery,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator,
    });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(acquisitions.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("does not send an expired pending grant during an idempotent retry", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-07-30T11:59:59.999Z"),
      status: "replay",
    });
    const delivery = createDelivery();
    const { acquireProducts } = createUseCase({ acquisitions, delivery });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key with a different payload before reading the catalog", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.resolveIdempotency).mockResolvedValue({
      status: "idempotency_conflict",
    });
    const delivery = createDelivery();
    const catalog = createCatalog();
    const acquireProducts = new AcquireProductsUseCase({
      acquisitions,
      catalog,
      clock: { now: () => fixedNow },
      logger: createLogger(),
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      delivery,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(catalog.getPublishedCatalog).not.toHaveBeenCalled();
    expect(acquisitions.prepareAcquisition).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("rejects all products when the persistence transaction observes a catalog change", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    vi.mocked(acquisitions.prepareAcquisition).mockResolvedValue({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    const delivery = createDelivery();
    const acquireProducts = new AcquireProductsUseCase({
      acquisitions,
      catalog: createCatalog(),
      clock: { now: () => fixedNow },
      logger: createLogger(),
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      delivery,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("reports an unknown outcome when the acceptance audit cannot be written", async () => {
    // arrange
    const acquisitions = createAcquisitions();
    const delivery = createDelivery();
    const { acquireProducts } = createUseCase({ acquisitions, delivery });
    vi.mocked(acquisitions.recordDeliveryAccepted).mockRejectedValue(
      new Error("audit write failed"),
    );

    // act
    const result = await acquireProducts.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(delivery.deliver).toHaveBeenCalledTimes(1);
  });

  it("measures the delivery cooldown and rolling allowance from the current time", async () => {
    // arrange
    const { acquireProducts, acquisitions } = createUseCase({});

    // act
    await acquireProducts.execute(command);

    // assert
    expect(acquisitions.prepareAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        cooldownSince: new Date("2026-07-30T11:59:00.000Z"),
        dailyLimit: 10,
        dailyWindowSince: new Date("2026-07-29T12:00:00.000Z"),
        deliveryLimitKey: "woman@example.com",
      }),
    );
  });

  it("shares one allowance across sub-addressed variants of an inbox", async () => {
    // arrange
    const { acquireProducts, acquisitions } = createUseCase({});

    // act
    await acquireProducts.execute({
      ...command,
      email: "Woman+Guides@Example.com ",
    });

    // assert
    expect(acquisitions.prepareAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryLimitKey: "woman@example.com",
        normalizedEmail: "woman+guides@example.com",
      }),
    );
  });

  it.each(["cooldown", "daily"] as const)(
    "reports the %s window without delivering when the recipient is over the limit",
    async (window) => {
      // arrange
      const acquisitions = createAcquisitions();
      const delivery = createDelivery();
      const { acquireProducts } = createUseCase({ acquisitions, delivery });
      vi.mocked(acquisitions.prepareAcquisition).mockResolvedValue({
        status: "rate_limited",
        window,
      });

      // act
      const result = await acquireProducts.execute(command);

      // assert
      expect(result).toEqual({ status: "rate_limited", window });
      expect(delivery.deliver).not.toHaveBeenCalled();
      expect(acquisitions.recordDeliveryRetryable).not.toHaveBeenCalled();
    },
  );
});
