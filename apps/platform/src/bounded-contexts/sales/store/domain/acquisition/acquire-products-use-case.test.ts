import { describe, expect, it, vi } from "vitest";

import {
  createEmailAcceptance,
  type EmailSubaddressPolicy,
} from "~/shared/submission-checks/email-address";
import { PublishedProduct, type StoreCatalogPort } from "../product";

import { AcquireProductsUseCase } from "./acquire-products-use-case";
import type { ProductDeliveryPort } from "./product-delivery-port";
import type {
  AcquisitionPreparation,
  StoreAcquisitionsPort,
} from "./store-acquisitions-port";

const fixedNow = new Date("2026-07-30T12:00:00.000Z");

function createAcquisitionIncidents() {
  return {
    deliveryAcceptanceAuditPending: vi.fn(),
    deliveryRejected: vi.fn(),
    retryableDeliveryAuditPending: vi.fn(),
  };
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
): StoreCatalogPort {
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
): StoreAcquisitionsPort {
  return {
    prepareAcquisition: vi.fn().mockResolvedValue(preparation),
    recordDeliveryAccepted: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRejected: vi.fn().mockResolvedValue(undefined),
    recordDeliveryRetryable: vi.fn().mockResolvedValue(undefined),
    resolveIdempotency: vi.fn().mockResolvedValue(null),
  };
}

function createDelivery(): ProductDeliveryPort {
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
  storeAcquisitionsPort?: StoreAcquisitionsPort;
  storeCatalogPort?: StoreCatalogPort;
  productDeliveryPort?: ProductDeliveryPort;
  emailSubaddresses?: EmailSubaddressPolicy;
  incidents?: ReturnType<typeof createAcquisitionIncidents>;
}) {
  const events: string[] = [];
  const storeAcquisitionsPort =
    options.storeAcquisitionsPort ?? createAcquisitions();
  const productDeliveryPort = options.productDeliveryPort ?? createDelivery();
  const incidents = options.incidents ?? createAcquisitionIncidents();
  const payloadDigestGenerator = {
    digest: vi.fn().mockReturnValue("payload-digest"),
  };

  vi.mocked(storeAcquisitionsPort.prepareAcquisition).mockImplementation(
    async () => {
      events.push("prepared");
      return {
        deliveryAttemptId: 41,
        deliveryProvider: productDeliveryPort.provider,
        providerIdempotencyKey:
          productDeliveryPort.createProviderIdempotencyKey(
            command.idempotencyKey,
          ),
        status: "created",
        requestId: 31,
      };
    },
  );
  vi.mocked(productDeliveryPort.deliver).mockImplementation(async () => {
    events.push("sent");
    return {
      kind: "delivered",
      provider: "resend",
      providerMessageId: "email-1",
    };
  });
  vi.mocked(storeAcquisitionsPort.recordDeliveryAccepted).mockImplementation(
    async () => {
      events.push("accepted");
    },
  );

  return {
    storeAcquisitionsPort,
    productDeliveryPort,
    events,
    incidents,
    payloadDigestGenerator,
    acquireProductsUseCase: new AcquireProductsUseCase({
      storeAcquisitionsPort,
      storeCatalogPort: options.storeCatalogPort ?? createCatalog(),
      clockPort: { now: () => fixedNow },
      consentVersionsPort: {
        current: () => ({
          marketingConsentVersion: "1.0",
          privacyPolicyVersion: "2.0",
          termsVersion: "1.0",
        }),
      },
      productDeliveryPort,
      emailAcceptancePort: createEmailAcceptance(
        options.emailSubaddresses ?? "allowed",
      ),
      acquisitionIncidentsPort: incidents,
      payloadDigestGeneratorPort: payloadDigestGenerator,
      downloadTokenGeneratorPort: {
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
      acquireProductsUseCase,
      storeAcquisitionsPort,
      productDeliveryPort,
      events,
      payloadDigestGenerator,
    } = createUseCase({});

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(events).toEqual(["prepared", "sent", "accepted"]);
    expect(storeAcquisitionsPort.prepareAcquisition).toHaveBeenCalledWith(
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
    expect(productDeliveryPort.deliver).toHaveBeenCalledWith(
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
    const storeAcquisitionsPort = createAcquisitions();
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      storeCatalogPort: createCatalog([product]),
      productDeliveryPort,
    });

    // act
    const result = await acquireProductsUseCase.execute({
      ...command,
      productSlugs: ["hormone-harmony", "removed-guide"],
    });

    // assert
    expect(result).toEqual({
      status: "unavailable_products",
      availableProductSlugs: ["hormone-harmony"],
    });
    expect(storeAcquisitionsPort.prepareAcquisition).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("replays a delivered technical request before reading the mutable catalog", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "accepted",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const productDeliveryPort = createDelivery();
    const storeCatalogPort = createCatalog();
    vi.mocked(storeCatalogPort.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "unused",
        sha256: "b".repeat(64),
      }),
    };
    const acquireProductsUseCase = new AcquireProductsUseCase({
      storeAcquisitionsPort,
      storeCatalogPort,
      clockPort: { now: () => fixedNow },
      consentVersionsPort: {
        current: () => ({
          marketingConsentVersion: "1.0",
          privacyPolicyVersion: "2.0",
          termsVersion: "1.0",
        }),
      },
      productDeliveryPort,
      emailAcceptancePort: createEmailAcceptance("allowed"),
      acquisitionIncidentsPort: createAcquisitionIncidents(),
      payloadDigestGeneratorPort: { digest: () => "payload-digest" },
      downloadTokenGeneratorPort: tokenGenerator,
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
    expect(storeCatalogPort.getPublishedCatalog).not.toHaveBeenCalled();
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(storeAcquisitionsPort.prepareAcquisition).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
    expect(storeAcquisitionsPort.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("keeps catalog infrastructure failures retryable without preparing delivery", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    const storeCatalogPort = createCatalog();
    vi.mocked(storeCatalogPort.getPublishedCatalog).mockRejectedValue(
      new Error("catalog unavailable"),
    );
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      storeCatalogPort,
      productDeliveryPort,
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(storeAcquisitionsPort.prepareAcquisition).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous provider transport failure pending for an idempotent retry", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    const productDeliveryPort = createDelivery();
    const setup = createUseCase({ storeAcquisitionsPort, productDeliveryPort });
    vi.mocked(productDeliveryPort.deliver).mockRejectedValue(
      new Error("provider unavailable"),
    );

    // act
    const result = await setup.acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(storeAcquisitionsPort.prepareAcquisition).toHaveBeenCalledTimes(1);
    expect(storeAcquisitionsPort.recordDeliveryRejected).not.toHaveBeenCalled();
  });

  it("records an ambiguous provider outcome before allowing a retry", async () => {
    // arrange
    const recordDeliveryRetryable = vi.fn().mockResolvedValue(undefined);
    const acquisitions = {
      ...createAcquisitions(),
      recordDeliveryRetryable,
    };
    const productDeliveryPort = createDelivery();
    const setup = createUseCase({
      storeAcquisitionsPort: acquisitions,
      productDeliveryPort,
    });
    vi.mocked(productDeliveryPort.deliver).mockResolvedValue({
      kind: "unconfirmed",
    });

    // act
    const result = await setup.acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(recordDeliveryRetryable).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
    });
  });

  it("reports when a retryable delivery outcome cannot be audited", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.recordDeliveryRetryable).mockRejectedValue(
      new Error("database unavailable"),
    );
    const setup = createUseCase({ storeAcquisitionsPort });
    vi.mocked(setup.productDeliveryPort.deliver).mockResolvedValue({
      kind: "unconfirmed",
    });

    // act
    const result = await setup.acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(setup.incidents.retryableDeliveryAuditPending).toHaveBeenCalledWith({
      requestId: 31,
    });
  });

  it("does not resend a pending technical replay", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      productDeliveryPort,
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("records a definitive provider rejection while preserving the committed acquisition", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    const productDeliveryPort = createDelivery();
    const setup = createUseCase({ storeAcquisitionsPort, productDeliveryPort });
    vi.mocked(productDeliveryPort.deliver).mockResolvedValue({
      kind: "rejected",
      reason: "invalid_from_address",
    });

    // act
    const result = await setup.acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(storeAcquisitionsPort.recordDeliveryRejected).toHaveBeenCalledWith({
      deliveryAttemptId: 41,
      requestId: 31,
      provider: "resend",
    });
    expect(setup.incidents.deliveryRejected).toHaveBeenCalledWith({
      reason: "invalid_from_address",
      requestId: 31,
    });
  });

  it("keeps the request retryable when an accepted delivery cannot be audited", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(
      storeAcquisitionsPort.recordDeliveryAccepted,
    ).mockRejectedValueOnce(new Error("database unavailable"));
    const setup = createUseCase({ storeAcquisitionsPort });

    // act
    const result = await setup.acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(storeAcquisitionsPort.recordDeliveryRejected).not.toHaveBeenCalled();
    expect(setup.incidents.deliveryAcceptanceAuditPending).toHaveBeenCalledWith(
      { requestId: 31 },
    );
  });

  it("does not resend when accepted delivery audit remains pending", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-08-06T12:00:00.000Z"),
      status: "replay",
    });
    const productDeliveryPort = createDelivery();
    const tokenGenerator = {
      create: vi.fn().mockReturnValue({
        rawToken: "stable-raw-token",
        sha256: "b".repeat(64),
      }),
    };
    const acquireProductsUseCase = new AcquireProductsUseCase({
      storeAcquisitionsPort,
      storeCatalogPort: createCatalog([]),
      clockPort: { now: () => fixedNow },
      consentVersionsPort: {
        current: () => ({
          marketingConsentVersion: "2.0",
          privacyPolicyVersion: "3.0",
          termsVersion: "2.0",
        }),
      },
      productDeliveryPort,
      emailAcceptancePort: createEmailAcceptance("allowed"),
      acquisitionIncidentsPort: createAcquisitionIncidents(),
      payloadDigestGeneratorPort: { digest: () => "payload-digest" },
      downloadTokenGeneratorPort: tokenGenerator,
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(tokenGenerator.create).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
    expect(storeAcquisitionsPort.recordDeliveryAccepted).not.toHaveBeenCalled();
  });

  it("does not send an expired pending grant during an idempotent retry", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.resolveIdempotency).mockResolvedValue({
      deliveryStatus: "pending",
      expiresAt: new Date("2026-07-30T11:59:59.999Z"),
      status: "replay",
    });
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      productDeliveryPort,
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_unavailable" });
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key with a different payload before reading the catalog", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.resolveIdempotency).mockResolvedValue({
      status: "idempotency_conflict",
    });
    const productDeliveryPort = createDelivery();
    const storeCatalogPort = createCatalog();
    const acquireProductsUseCase = new AcquireProductsUseCase({
      storeAcquisitionsPort,
      storeCatalogPort,
      clockPort: { now: () => fixedNow },
      consentVersionsPort: {
        current: () => ({
          marketingConsentVersion: "1.0",
          privacyPolicyVersion: "2.0",
          termsVersion: "1.0",
        }),
      },
      productDeliveryPort,
      emailAcceptancePort: createEmailAcceptance("allowed"),
      acquisitionIncidentsPort: createAcquisitionIncidents(),
      payloadDigestGeneratorPort: { digest: () => "payload-digest" },
      downloadTokenGeneratorPort: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(storeCatalogPort.getPublishedCatalog).not.toHaveBeenCalled();
    expect(storeAcquisitionsPort.prepareAcquisition).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("rejects all products when the persistence transaction observes a catalog change", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    vi.mocked(storeAcquisitionsPort.prepareAcquisition).mockResolvedValue({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    const productDeliveryPort = createDelivery();
    const acquireProductsUseCase = new AcquireProductsUseCase({
      storeAcquisitionsPort,
      storeCatalogPort: createCatalog(),
      clockPort: { now: () => fixedNow },
      consentVersionsPort: {
        current: () => ({
          marketingConsentVersion: "1.0",
          privacyPolicyVersion: "2.0",
          termsVersion: "1.0",
        }),
      },
      productDeliveryPort,
      emailAcceptancePort: createEmailAcceptance("allowed"),
      acquisitionIncidentsPort: createAcquisitionIncidents(),
      payloadDigestGeneratorPort: { digest: () => "payload-digest" },
      downloadTokenGeneratorPort: {
        create: () => ({ rawToken: "unused", sha256: "b".repeat(64) }),
      },
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("reports an unknown outcome when the acceptance audit cannot be written", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      productDeliveryPort,
    });
    vi.mocked(storeAcquisitionsPort.recordDeliveryAccepted).mockRejectedValue(
      new Error("audit write failed"),
    );

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivery_retryable" });
    expect(productDeliveryPort.deliver).toHaveBeenCalledTimes(1);
  });

  it("measures the delivery cooldown and rolling allowance from the current time", async () => {
    // arrange
    const { acquireProductsUseCase, storeAcquisitionsPort } = createUseCase({});

    // act
    await acquireProductsUseCase.execute(command);

    // assert
    expect(storeAcquisitionsPort.prepareAcquisition).toHaveBeenCalledWith(
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
    const { acquireProductsUseCase, storeAcquisitionsPort } = createUseCase({});

    // act
    await acquireProductsUseCase.execute({
      ...command,
      email: "Woman+Guides@Example.com ",
    });

    // assert
    expect(storeAcquisitionsPort.prepareAcquisition).toHaveBeenCalledWith(
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
      const storeAcquisitionsPort = createAcquisitions();
      const productDeliveryPort = createDelivery();
      const { acquireProductsUseCase } = createUseCase({
        storeAcquisitionsPort,
        productDeliveryPort,
      });
      vi.mocked(storeAcquisitionsPort.prepareAcquisition).mockResolvedValue({
        status: "rate_limited",
        window,
      });

      // act
      const result = await acquireProductsUseCase.execute(command);

      // assert
      expect(result).toEqual({ status: "rate_limited", window });
      expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
      expect(
        storeAcquisitionsPort.recordDeliveryRetryable,
      ).not.toHaveBeenCalled();
    },
  );

  it("refuses a subaddressed email before reading the idempotency record, the catalog or the delivery allowance", async () => {
    // arrange
    const storeAcquisitionsPort = createAcquisitions();
    const storeCatalogPort = createCatalog();
    const productDeliveryPort = createDelivery();
    const { acquireProductsUseCase } = createUseCase({
      storeAcquisitionsPort,
      storeCatalogPort,
      productDeliveryPort,
      emailSubaddresses: "refused",
    });

    // act
    const result = await acquireProductsUseCase.execute({
      ...command,
      email: "Woman+Guides@Example.com",
    });

    // assert
    expect(result).toEqual({ status: "subaddress_refused" });
    expect(storeAcquisitionsPort.resolveIdempotency).not.toHaveBeenCalled();
    expect(storeCatalogPort.getPublishedCatalog).not.toHaveBeenCalled();
    expect(storeAcquisitionsPort.prepareAcquisition).not.toHaveBeenCalled();
    expect(productDeliveryPort.deliver).not.toHaveBeenCalled();
  });

  it("delivers to a main address where subaddresses are refused", async () => {
    // arrange
    const { acquireProductsUseCase } = createUseCase({
      emailSubaddresses: "refused",
    });

    // act
    const result = await acquireProductsUseCase.execute(command);

    // assert
    expect(result).toEqual({ status: "delivered" });
  });
});
