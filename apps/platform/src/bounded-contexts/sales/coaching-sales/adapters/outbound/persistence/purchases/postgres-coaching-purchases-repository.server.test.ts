import type { DatabaseClient } from "~/shared/database";
import {
  PurchasedSubscription,
  type CoachingPurchase,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import { describe, expect, it, vi } from "vitest";

import { PostgresCoachingPurchasesRepository } from "./postgres-coaching-purchases-repository.server";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const PROGRAM_STARTS_AT = new Date("2026-11-03T10:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-20T10:00:00.000Z");
const HELD_CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const LINK_SENT_CALL_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const PAID_CALL_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const CLIENT_ID = "2d3e4f50-6172-4839-9a0b-1c2d3e4f5061";
const ADMITTED_CLIENT_ID = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
const SUBSCRIPTION_ID = "8e9f0a1b-2c3d-4e5f-9a6b-7c8d9e0f1a2b";

describe("PostgresCoachingPurchasesRepository#insertSubscription", () => {
  it("records the purchase for the admitted client under the id the domain gave it", async () => {
    // arrange
    const database = createRecordingDatabase();
    const { postgresCoachingPurchasesRepository } = createPurchases(
      database.client,
    );

    // act
    await postgresCoachingPurchasesRepository.insertSubscription(purchase());

    // assert
    expect(database.insertedRows).toEqual([
      expect.objectContaining({
        id: SUBSCRIPTION_ID,
        clientId: ADMITTED_CLIENT_ID,
        assessmentCallId: PAID_CALL_ID,
        stripeCheckoutSessionId: "cs_1",
        paidThrough: PAID_THROUGH,
        programStartsAt: PROGRAM_STARTS_AT,
        createdAt: NOW,
      }),
    ]);
  });
});

describe("PostgresCoachingPurchasesRepository#spendPaymentLink", () => {
  it("spends the payment link behind the checkout session", async () => {
    // arrange
    const database = createRecordingDatabase();
    const { postgresCoachingPurchasesRepository } = createPurchases(
      database.client,
    );

    // act
    await postgresCoachingPurchasesRepository.spendPaymentLink("cs_1");

    // assert
    expect(database.update).toHaveBeenCalledTimes(1);
    expect(database.insertedRows).toEqual([]);
  });
});

describe("PostgresCoachingPurchasesRepository#findClientIdForCall", () => {
  it("answers the client recorded for the call", async () => {
    // arrange
    const { postgresCoachingPurchasesRepository } = createPurchases(
      createRecordingDatabase().client,
    );

    // act
    const clientId =
      await postgresCoachingPurchasesRepository.findClientIdForCall(
        PAID_CALL_ID,
      );

    // assert
    expect(clientId).toBe("client-recorded-earlier");
  });

  it("refuses a call whose recorded client cannot be found", async () => {
    // arrange
    const { postgresCoachingPurchasesRepository } = createPurchases(
      createRecordingDatabase({ recordedClients: [] }).client,
    );

    // act
    const lookup =
      postgresCoachingPurchasesRepository.findClientIdForCall(PAID_CALL_ID);

    // assert
    await expect(lookup).rejects.toThrow(PAID_CALL_ID);
  });
});

describe("PostgresCoachingPurchasesRepository#forCalls", () => {
  it("answers a state for every requested call, held when nothing is recorded, and lets paid outrank a sent link", async () => {
    // arrange
    const { postgresCoachingPurchasesRepository } = createPurchases(
      createDatabaseAnsweringSalesRows([
        {
          assessmentCallId: PAID_CALL_ID,
          state: "payment-link-sent",
          clientId: null,
        },
        {
          assessmentCallId: LINK_SENT_CALL_ID,
          state: "payment-link-sent",
          clientId: null,
        },
        { assessmentCallId: PAID_CALL_ID, state: "paid", clientId: CLIENT_ID },
      ]),
    );

    // act
    const states = await postgresCoachingPurchasesRepository.forCalls([
      HELD_CALL_ID,
      LINK_SENT_CALL_ID,
      PAID_CALL_ID,
    ]);

    // assert
    expect(Object.fromEntries(states)).toEqual({
      [HELD_CALL_ID]: { state: "held", clientId: null },
      [LINK_SENT_CALL_ID]: { state: "payment-link-sent", clientId: null },
      [PAID_CALL_ID]: { state: "paid", clientId: CLIENT_ID },
    });
  });

  it("keeps the client a paid call created when a sent link is read after it", async () => {
    // arrange
    const { postgresCoachingPurchasesRepository } = createPurchases(
      createDatabaseAnsweringSalesRows([
        { assessmentCallId: PAID_CALL_ID, state: "paid", clientId: CLIENT_ID },
        {
          assessmentCallId: PAID_CALL_ID,
          state: "payment-link-sent",
          clientId: null,
        },
      ]),
    );

    // act
    const states = await postgresCoachingPurchasesRepository.forCalls([
      PAID_CALL_ID,
    ]);

    // assert
    expect(states.get(PAID_CALL_ID)).toEqual({
      state: "paid",
      clientId: CLIENT_ID,
    });
  });

  it("answers an empty map without querying when no call is asked for", async () => {
    // arrange
    const { postgresCoachingPurchasesRepository } = createPurchases(
      createUnreachableDatabase(),
    );

    // act
    const states = await postgresCoachingPurchasesRepository.forCalls([]);

    // assert
    expect(states.size).toBe(0);
  });
});

function createPurchases(database: DatabaseClient) {
  const postgresCoachingPurchasesRepository =
    new PostgresCoachingPurchasesRepository({
      clockPort: { now: () => NOW },
      database,
    });

  return { postgresCoachingPurchasesRepository };
}

function purchase(): CoachingPurchase {
  return {
    assessmentCallId: PAID_CALL_ID,
    clientId: ADMITTED_CLIENT_ID,
    receivedAt: NOW,
    subscription: PurchasedSubscription.fromCompletedCheckout({
      id: SUBSCRIPTION_ID,
      completion: {
        checkoutSessionId: "cs_1",
        paymentCustomerId: "cus_1",
        paymentSubscriptionId: "sub_1",
        paymentIntentId: "pi_1",
        amountCents: 44700,
        currency: "eur",
        customerEmail: "ana@example.com",
        paidAt: NOW,
        assessmentCallId: PAID_CALL_ID,
        bundleId: "3-months",
        tier: "regular",
        startChoice: "waiting",
      },
    }),
  };
}

function createRecordingDatabase(
  options: { recordedClients: readonly unknown[] } = {
    recordedClients: [{ clientId: "client-recorded-earlier" }],
  },
) {
  const insertedRows: unknown[] = [];
  const update = vi.fn(() => ({ set: () => ({ where: async () => [] }) }));
  const client = {
    insert: () => ({
      values: async (row: unknown) => {
        insertedRows.push(row);
      },
    }),
    select: () => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve(options.recordedClients), {
            limit: async () => options.recordedClients,
          }),
      }),
    }),
    update,
  } as unknown as DatabaseClient;

  return { client, insertedRows, update };
}

function createDatabaseAnsweringSalesRows(
  rows: readonly unknown[],
): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () => selection,
    union: () => Promise.resolve(rows),
    getSQL: () => ({}),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}

function createUnreachableDatabase(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database should not be queried");
    },
  } as unknown as DatabaseClient;
}
