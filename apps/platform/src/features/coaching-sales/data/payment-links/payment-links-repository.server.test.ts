import type { DatabaseClient } from "@eli-coach-platform/db";
import { PaymentLink } from "@eli-coach-platform/domain/payment-link";
import { describe, expect, it } from "vitest";

import { paymentLinksTable } from "~/features/coaching-sales/data/schema.server";

import { PostgresPaymentLinks } from "./payment-links-repository.server";

const NOW = new Date("2026-10-20T10:00:00.000Z");

describe("PostgresPaymentLinks#findByTokenSha256", () => {
  it("reconstitutes the stored link with its paid customer", async () => {
    // arrange
    const paymentLinks = createPaymentLinks(
      createDatabaseAnswering([
        {
          id: "9b0f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
          assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
          tokenSha256: "a".repeat(64),
          state: "valid",
          createdAt: new Date("2026-10-19T10:00:00.000Z"),
          expiresAt: new Date("2026-11-18T10:00:00.000Z"),
          stripeCustomerId: "cus_1",
        },
      ]),
    );

    // act
    const link = await paymentLinks.findByTokenSha256("a".repeat(64));

    // assert
    expect(link?.id).toBe("9b0f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11");
    expect(link?.paymentCustomerId).toBe("cus_1");
    expect(link?.isUsable(NOW)).toBe(true);
  });

  it("answers null for a hash no link carries", async () => {
    // arrange
    const paymentLinks = createPaymentLinks(createDatabaseAnswering([]));

    // act
    const link = await paymentLinks.findByTokenSha256("b".repeat(64));

    // assert
    expect(link).toBeNull();
  });
});

describe("PostgresPaymentLinks#issue", () => {
  it("stores the issued link under the id the domain gave it", async () => {
    // arrange
    const database = createDatabaseRecordingInserts();
    const paymentLinks = createPaymentLinks(database.handle);
    const link = PaymentLink.issued({
      id: "9b0f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      tokenSha256: "a".repeat(64),
      at: NOW,
    });

    // act
    await paymentLinks.issue(link);

    // assert
    expect(database.inserts).toEqual([
      {
        table: paymentLinksTable,
        values: {
          id: "9b0f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
          assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
          tokenSha256: "a".repeat(64),
          createdAt: NOW,
          expiresAt: new Date("2026-11-19T10:00:00.000Z"),
          state: "valid",
          stripeCustomerId: null,
        },
      },
    ]);
  });
});

function createPaymentLinks(database: DatabaseClient): PostgresPaymentLinks {
  return new PostgresPaymentLinks({ clock: { now: () => NOW }, database });
}

function createDatabaseAnswering(rows: readonly unknown[]): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () => selection,
    limit: () => Promise.resolve(rows),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}

function createDatabaseRecordingInserts() {
  const inserts: { table: unknown; values: unknown }[] = [];
  const handle = {
    insert: (table: unknown) => ({
      values: async (values: unknown) => {
        inserts.push({ table, values });
      },
    }),
  } as unknown as DatabaseClient;

  return { handle, inserts };
}
