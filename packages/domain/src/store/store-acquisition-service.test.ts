import { describe, expect, it, vi } from "vitest";

import {
  resolveDeliveryLimitKey,
  StoreAcquisitionService,
  StoreDeliveryRejectedError,
  type AcquisitionPreparation,
  type PublishedStoreProduct,
  type StoreAcquisitionRepository,
  type StoreCatalogRepository,
  type StoreDeliveryService,
} from "./index";

const fixedNow = new Date("2026-07-30T12:00:00.000Z");
const product = {
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
} satisfies PublishedStoreProduct;

function createCatalogRepository(
  availableProducts: readonly PublishedStoreProduct[] = [product],
): StoreCatalogRepository {
  return {
    getPublishedCatalog: vi.fn().mockResolvedValue(availableProducts),
    getPublishedProductBySlug: vi.fn().mockResolvedValue(product),
    getPublishedCoverByAssetKey: vi.fn().mockResolvedValue(null),
  };
}

function createAcquisitionRepository(
  preparation: AcquisitionPreparation = {
    deliveryAttemptId: 41,
    deliveryProvider: "resend",
    providerIdempotencyKey: createProviderIdempotencyKey(
      command.idempotencyKey,
    ),
    status: "created",
    requestId: 31,
  },
): StoreAcquisitionRepository {
  return {
    prepareAcquisition: vi.fn().mockResolvedValue(preparation),
    recordDeliveryAccepted: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRejected: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRetryable: vi.fn().mockResolvedValue(undefined),
    resolveIdempotency: vi.fn().mockResolvedValue(null),
  };
}

function createDeliveryService(): StoreDeliveryService {
  return {
    createProviderIdempotencyKey,
    provider: "resend",
    deliver: vi.fn().mockResolvedValue({
      provider: "resend",
      providerMessageId: "email-1",
    }),
  };
}

function createService(options: {
  acquisitionRepository?: StoreAcquisitionRepository;
  catalogRepository?: StoreCatalogRepository;
  deliveryService?: StoreDeliveryService;
}) {
  const events: string[] = [];
  const acquisitionRepository =
    options.acquisitionRepository ?? createAcquisitionRepository();
  const deliveryService = options.deliveryService ?? createDeliveryService();
  const payloadDigestGenerator = {
    digest: vi.fn().mockReturnValue("payload-digest"),
  };

  vi.mocked(acquisitionRepository.prepareAcquisition).mockImplementation(
    async () => {
      events.push("prepared");
      return {
        deliveryAttemptId: 41,
        deliveryProvider: deliveryService.provider,
        providerIdempotencyKey:
          deliveryService.createProviderIdempotencyKey(
            command.idempotencyKey,
          ),
        status: "created",
        requestId: 31,
      };
    },
  );
  vi.mocked(deliveryService.deliver).mockImplementation(async () => {
    events.push("sent");
    return {
      provider: "resend",
      providerMessageId: "email-1",
    };
  });
  vi.mocked(acquisitionRepository.recordDeliveryAccepted).mockImplementation(
    async () => {
      events.push("accepted");
    },
  );

  return {
    acquisitionRepository,
    deliveryService,
    events,
    payloadDigestGenerator,
    service: new StoreAcquisitionService({
      acquisitionRepository,
      catalogRepository:
        options.catalogRepository ?? createCatalogRepository(),
      clock: { now: () => fixedNow },
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      deliveryService,
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

describe("resolveDeliveryLimitKey", () => {
  it.each([
    ["woman+guides@example.com", "woman@example.com"],
    ["woman@example.com", "woman@example.com"],
    ["woman+one+two@example.com", "woman@example.com"],
    ["woman@sub.example.com", "woman@sub.example.com"],
    ["not-an-email", "not-an-email"],
  ])("folds %s to %s", (normalizedEmail, expected) => {
    // arrange, act
    const limitKey = resolveDeliveryLimitKey(normalizedEmail);

    // assert
    expect(limitKey).toBe(expected);
  });
});

describe("StoreAcquisitionService", () => {
  it("commits normalized acquisition and a seven-day grant before sending one email", async () => {
    // arrange
    const {
      acquisitionRepository,
      deliveryService,
      events,
      payloadDigestGenerator,
      service,
    } = createService({});

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(events).toEqual(["prepared", "sent", "accepted"]);
    expect(acquisitionRepository.prepareAcquisition).toHaveBeenCalledWith(
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
    expect(deliveryService.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: createProviderIdempotencyKey(
          command.idempotencyKey,
        ),
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
    const acquisitionRepository = createAcquisitionRepository();
    const deliveryService = createDeliveryService();
    const service = createService({
      acquisitionRepository,
      catalogRepository: createCatalogRepository([product]),
      deliveryService,
    }).service;

    // act
    const result = await service.acquire({
      ...command,
      productSlugs: ["hormone-harmony", "removed-guide"],
    });

    // assert
    expect(result).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["hormone-harmony"],
    });
    expect(acquisitionRepository.prepareAcquisition).not.toHaveBeenCalled();
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("replays a delivered technical request before reading the mutable catalog", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "accepted",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const deliveryService = createDeliveryService();
    const catalogRepository = createCatalogRepository();
    vi.mocked(catalogRepository.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "unused",
        sha256: "b".repeat(64),
      }),
    };
    const service = new StoreAcquisitionService({
      acquisitionRepository,
      catalogRepository,
      clock: { now: () => fixedNow },
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      deliveryService,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator,
    });

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(catalogRepository.getPublishedCatalog).not.toHaveBeenCalled();
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(acquisitionRepository.prepareAcquisition).not.toHaveBeenCalled();
    expect(deliveryService.deliver).not.toHaveBeenCalled();
    expect(acquisitionRepository.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("keeps catalog infrastructure failures retryable without preparing delivery", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    const catalogRepository = createCatalogRepository();
    vi.mocked(catalogRepository.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const deliveryService = createDeliveryService();
    const service = createService({
      acquisitionRepository,
      catalogRepository,
      deliveryService,
    }).service;

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitionRepository.prepareAcquisition).not.toHaveBeenCalled();
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous provider transport failure pending for an idempotent retry", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    const deliveryService = createDeliveryService();
    const setup = createService({
      acquisitionRepository,
      deliveryService,
    });
    vi.mocked(deliveryService.deliver).mockRejectedValue(
      new Error("provider unavailable"),
    );

    // act
    const result = await setup.service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitionRepository.prepareAcquisition).toHaveBeenCalledTimes(1);
    expect(
      acquisitionRepository.recordDeliveryRejected,
    ).not.toHaveBeenCalled();
  });

  it("records an ambiguous provider outcome before allowing a retry", async () => {
    // arrange
    const recordDeliveryRetryable = vi.fn().mockResolvedValue(undefined);
    const acquisitionRepository = {
      ...createAcquisitionRepository(),
      recordDeliveryRetryable,
    };
    const deliveryService = createDeliveryService();
    const setup = createService({
      acquisitionRepository,
      deliveryService,
    });
    vi.mocked(deliveryService.deliver).mockRejectedValue(
      new Error("provider unavailable"),
    );

    // act
    const result = await setup.service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(recordDeliveryRetryable).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
    });
  });

  it("does not resend a pending technical replay", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const deliveryService = createDeliveryService();
    const service = createService({
      acquisitionRepository,
      deliveryService,
    }).service;

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("records a definitive provider rejection while preserving the committed acquisition", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    const deliveryService = createDeliveryService();
    const setup = createService({
      acquisitionRepository,
      deliveryService,
    });
    vi.mocked(deliveryService.deliver).mockRejectedValue(
      new StoreDeliveryRejectedError(),
    );

    // act
    const result = await setup.service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(acquisitionRepository.recordDeliveryRejected).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
      provider: "resend",
    });
  });

  it("keeps the request retryable when an accepted delivery cannot be audited", async () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(
      acquisitionRepository.recordDeliveryAccepted,
    ).mockRejectedValueOnce(new Error("database unavailable"));
    const setup = createService({ acquisitionRepository });

    // act
    const result = await setup.service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(acquisitionRepository.recordDeliveryRejected).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Store delivery acceptance audit requires reconciliation.",
      {
        errorCategory: "store_delivery_acceptance_audit_pending",
        requestId: 31,
      },
    );
    consoleError.mockRestore();
  });

  it("does not resend when accepted delivery audit remains pending", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const deliveryService = createDeliveryService();
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "stable-raw-token",
        sha256: "b".repeat(64),
      }),
    };
    const service = new StoreAcquisitionService({
      acquisitionRepository,
      catalogRepository: createCatalogRepository([]),
      clock: { now: () => fixedNow },
      consentVersions: {
        marketingConsentVersion: "2.0",
        privacyPolicyVersion: "3.0",
        termsVersion: "2.0",
      },
      deliveryService,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator,
    });

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(deliveryService.deliver).not.toHaveBeenCalled();
    expect(acquisitionRepository.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("does not send an expired pending grant during an idempotent retry", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-07-30T11:59:59.999Z"),
      status: "replay",
    });
    const deliveryService = createDeliveryService();
    const service = createService({
      acquisitionRepository,
      deliveryService,
    }).service;

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key with a different payload before reading the catalog", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.resolveIdempotency).mockResolvedValue({
      status: "idempotency_conflict",
    });
    const deliveryService = createDeliveryService();
    const catalogRepository = createCatalogRepository();
    const service = new StoreAcquisitionService({
      acquisitionRepository,
      catalogRepository,
      clock: { now: () => fixedNow },
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      deliveryService,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(catalogRepository.getPublishedCatalog).not.toHaveBeenCalled();
    expect(acquisitionRepository.prepareAcquisition).not.toHaveBeenCalled();
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("rejects all products when the persistence transaction observes a catalog change", async () => {
    // arrange
    const acquisitionRepository = createAcquisitionRepository();
    vi.mocked(acquisitionRepository.prepareAcquisition).mockResolvedValue({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    const deliveryService = createDeliveryService();
    const service = new StoreAcquisitionService({
      acquisitionRepository,
      catalogRepository: createCatalogRepository(),
      clock: { now: () => fixedNow },
      consentVersions: {
        marketingConsentVersion: "1.0",
        privacyPolicyVersion: "2.0",
        termsVersion: "1.0",
      },
      deliveryService,
      payloadDigestGenerator: { digest: () => "payload-digest" },
      tokenGenerator: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await service.acquire(command);

    // assert
    expect(result).toEqual({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    expect(deliveryService.deliver).not.toHaveBeenCalled();
  });

  it("measures the delivery cooldown and rolling allowance from the current time", async () => {
    // arrange
    const { acquisitionRepository, service } = createService({});

    // act
    await service.acquire(command);

    // assert
    expect(acquisitionRepository.prepareAcquisition).toHaveBeenCalledWith(
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
    const { acquisitionRepository, service } = createService({});

    // act
    await service.acquire({ ...command, email: "Woman+Guides@Example.com " });

    // assert
    expect(acquisitionRepository.prepareAcquisition).toHaveBeenCalledWith(
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
      const acquisitionRepository = createAcquisitionRepository();
      const deliveryService = createDeliveryService();
      const { service } = createService({
        acquisitionRepository,
        deliveryService,
      });
      vi.mocked(acquisitionRepository.prepareAcquisition).mockResolvedValue({
        status: "rate_limited",
        window,
      });

      // act
      const result = await service.acquire(command);

      // assert
      expect(result).toEqual({ status: "rate_limited", window });
      expect(deliveryService.deliver).not.toHaveBeenCalled();
      expect(
        acquisitionRepository.recordDeliveryRetryable,
      ).not.toHaveBeenCalled();
    },
  );
});
