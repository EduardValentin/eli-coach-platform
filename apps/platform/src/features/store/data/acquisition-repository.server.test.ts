import { describe, expect, it, vi } from "vitest";

import type {
  PrepareAcquisitionCommand,
  PublishedStoreProduct,
} from "@eli-coach-platform/domain";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresStoreAcquisitionRepository } from "./acquisition-repository.server";

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
    detailDescription: "Cycle-aware guidance.",
    includedItems: ["Phase-by-phase guidance"],
    cover: {
      assetKey: "covers/hormone-harmony.webp",
      alt: "Hormone Harmony guide cover",
      mimeType: "image/webp",
      sizeBytes: 96,
      sha256: "c".repeat(64),
    },
    assets: [],
    types: [],
    goals: [],
    publishedAt: new Date("2026-07-30T10:00:00.000Z"),
  },
} satisfies PublishedStoreProduct;

const command = {
  normalizedEmail: "woman@example.com",
  idempotencyKey: "d744ad8e-632c-4dfe-ac70-033bd3221522",
  payloadDigest: "a".repeat(64),
  products: [product],
  termsVersion: "1.0",
  privacyPolicyVersion: "2.0",
  marketingConsentVersion: "1.0",
  marketingConsent: false,
  marketingConsentedAt: null,
  requestedAt: new Date("2026-07-30T12:00:00.000Z"),
  expiresAt: new Date("2026-08-06T12:00:00.000Z"),
  tokenSha256: "b".repeat(64),
  deliveryProvider: "resend",
  providerIdempotencyKey:
    "store-acquisition-d744ad8e-632c-4dfe-ac70-033bd3221522",
  cooldownSince: new Date("2026-07-30T11:59:00.000Z"),
  dailyWindowSince: new Date("2026-07-29T12:00:00.000Z"),
  dailyLimit: 5,
} satisfies PrepareAcquisitionCommand;

/** Postgres returns bigint aggregates as strings through node-postgres. */
function deliveryUsageRows(usage: {
  cooldownCount: number;
  dailyCount: number;
}) {
  return {
    rows: [
      {
        cooldownCount: String(usage.cooldownCount),
        dailyCount: String(usage.dailyCount),
      },
    ],
  };
}

describe("PostgresStoreAcquisitionRepository", () => {
  it("resolves a stored accepted outcome without opening a write transaction", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          deliveryProvider: command.deliveryProvider,
          requestId: 31,
          payloadDigest: command.payloadDigest,
          deliveryStatus: "accepted",
          expiresAt: command.expiresAt,
          normalizedEmail: command.normalizedEmail,
          resources: [
            {
              title: "Hormone Harmony",
              typeLabels: ["E-Books"],
            },
          ],
          providerIdempotencyKey: command.providerIdempotencyKey,
          requestedAt: command.requestedAt,
        },
      ],
    });
    const transaction = vi.fn();
    const repository = new PostgresStoreAcquisitionRepository({
      execute,
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.resolveIdempotency(command);

    // assert
    expect(result).toEqual({
      deliveryStatus: "accepted",
      expiresAt: command.expiresAt,
      status: "replay",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns a stored delivery outcome for an identical technical replay", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          deliveryProvider: command.deliveryProvider,
          requestId: 31,
          payloadDigest: command.payloadDigest,
          deliveryStatus: "accepted",
          expiresAt: command.expiresAt,
          normalizedEmail: command.normalizedEmail,
          resources: [
            {
              title: "Hormone Harmony",
              typeLabels: ["E-Books"],
            },
          ],
          providerIdempotencyKey: command.providerIdempotencyKey,
          requestedAt: command.requestedAt,
        },
      ],
    });
    const transaction = vi.fn((callback) => callback({ execute }));
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.prepareAcquisition(command);

    // assert
    expect(result).toEqual({
      status: "replay",
      deliveryStatus: "accepted",
      expiresAt: command.expiresAt,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an idempotency key with a changed payload digest", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          deliveryProvider: command.deliveryProvider,
          requestId: 31,
          payloadDigest: "c".repeat(64),
          deliveryStatus: "accepted",
          normalizedEmail: command.normalizedEmail,
          resources: [
            {
              title: "Hormone Harmony",
              typeLabels: ["E-Books"],
            },
          ],
          providerIdempotencyKey: command.providerIdempotencyKey,
        },
      ],
    });
    const transaction = vi.fn((callback) => callback({ execute }));
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.prepareAcquisition(command);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
  });

  it("retries a serialization failure in a fresh transaction", async () => {
    // arrange
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("serialization failure"), { code: "40001" }),
      )
      .mockResolvedValueOnce({
        deliveryAttemptId: 41,
        deliveryProvider: command.deliveryProvider,
        providerIdempotencyKey: command.providerIdempotencyKey,
        status: "created",
        requestId: 31,
      });
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.prepareAcquisition(command);

    // assert
    expect(result).toEqual({
      deliveryAttemptId: 41,
      deliveryProvider: command.deliveryProvider,
      providerIdempotencyKey: command.providerIdempotencyKey,
      status: "created",
      requestId: 31,
    });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["cooldown", { cooldownCount: 1, dailyCount: 1 }],
    ["daily", { cooldownCount: 0, dailyCount: 5 }],
  ] as const)(
    "declines a %s-limited request before locking any catalog row",
    async (window, usage) => {
      // arrange
      const execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(deliveryUsageRows(usage));
      const transaction = vi.fn((callback) => callback({ execute }));
      const repository = new PostgresStoreAcquisitionRepository({
        transaction,
      } as unknown as DatabaseClient);

      // act
      const result = await repository.prepareAcquisition(command);

      // assert
      expect(result).toEqual({ status: "rate_limited", window });
      expect(execute).toHaveBeenCalledTimes(2);
    },
  );

  it("rejects a stale published version while the current catalog rows are locked", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(
        deliveryUsageRows({ cooldownCount: 0, dailyCount: 0 }),
      )
      .mockResolvedValueOnce({
        rows: [
          {
            id: product.id,
            lifecycleStatus: "published",
            slug: product.slug,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 12,
            productId: product.id,
            publishedAt: "2026-07-30T11:00:00.000Z",
            sequence: 3,
          },
        ],
      });
    const transaction = vi.fn((callback) => callback({ execute }));
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.prepareAcquisition(command);

    // assert
    expect(result).toEqual({
      availableProductSlugs: ["hormone-harmony"],
      status: "unavailable_products",
    });
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it("retries accepted-delivery auditing after a transient database failure", async () => {
    // arrange
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("connection interrupted"), { code: "08006" }),
      )
      .mockResolvedValueOnce(undefined);
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    await repository.recordDeliveryAccepted({
      deliveryAttemptId: 41,
      provider: "resend",
      providerMessageId: "message-31",
      requestId: 31,
    });

    // assert
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("revokes an undelivered grant with the definitive rejection", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const transaction = vi.fn((callback) => callback({ execute }));
    const repository = new PostgresStoreAcquisitionRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    await repository.recordDeliveryRejected({
      deliveryAttemptId: 41,
      provider: "resend",
      requestId: 31,
    });

    // assert
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("records an ambiguous outcome on the initial delivery attempt", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresStoreAcquisitionRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    await repository.recordDeliveryRetryable({
      deliveryAttemptId: 41,
      requestId: 31,
    });

    // assert
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
