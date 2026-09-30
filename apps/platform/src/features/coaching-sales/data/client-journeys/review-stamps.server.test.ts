import type { DatabaseTransaction } from "@eli-coach-platform/db";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

import { writeReviewStamps } from "./review-stamps.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const NO_REVIEW_STAMPS = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};
const REQUESTED_STAMPS = {
  reviewOpenedAt: new Date("2026-10-24T09:00:00.000Z"),
  detailsRequestedAt: new Date("2026-10-24T10:00:00.000Z"),
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

describe("writeReviewStamps", () => {
  it("writes the full set of review stamps on the client's row through the caller's transaction", async () => {
    // arrange
    const transaction = createTransactionRecordingUpdates();

    // act
    await writeReviewStamps(transaction.handle, {
      clientId: CLIENT_ID,
      stamps: REQUESTED_STAMPS,
    });

    // assert
    expect(transaction.updates).toEqual([
      { table: clientsTable, values: REQUESTED_STAMPS },
    ]);
    const filter = new PgDialect().sqlToQuery(transaction.filters[0] as SQL);
    expect(filter.sql).toBe('"app"."clients"."id" = $1');
    expect(filter.params).toEqual([CLIENT_ID]);
  });

  it("writes the same row when the same stamps are written twice", async () => {
    // arrange
    const transaction = createTransactionRecordingUpdates();
    const input = { clientId: CLIENT_ID, stamps: REQUESTED_STAMPS };

    // act
    await writeReviewStamps(transaction.handle, input);
    await writeReviewStamps(transaction.handle, input);

    // assert
    expect(transaction.updates[1]).toEqual(transaction.updates[0]);
    expect(transaction.filters[1]).toEqual(transaction.filters[0]);
  });

  it("clears a stamp the review no longer carries", async () => {
    // arrange
    const transaction = createTransactionRecordingUpdates();

    // act
    await writeReviewStamps(transaction.handle, {
      clientId: CLIENT_ID,
      stamps: NO_REVIEW_STAMPS,
    });

    // assert
    expect(transaction.updates).toEqual([
      { table: clientsTable, values: NO_REVIEW_STAMPS },
    ]);
  });
});

function createTransactionRecordingUpdates() {
  const updates: { table: unknown; values: unknown }[] = [];
  const filters: unknown[] = [];
  const handle = {
    update: (table: unknown) => ({
      set: (values: unknown) => {
        updates.push({ table, values });

        return {
          where: async (filter: unknown) => {
            filters.push(filter);
          },
        };
      },
    }),
  } as unknown as DatabaseTransaction;

  return { handle, filters, updates };
}
