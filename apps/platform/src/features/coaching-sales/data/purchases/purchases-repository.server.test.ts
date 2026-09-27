import type { DatabaseClient } from "@eli-coach-platform/db";
import { AssessmentCall } from "@eli-coach-platform/domain/assessment-call";
import { Client } from "@eli-coach-platform/domain/client";
import {
  CoachingSubscription,
  type CoachingPurchase,
} from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it, vi } from "vitest";

import { PostgresCoachingPurchases } from "./purchases-repository.server";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const HELD_CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const LINK_SENT_CALL_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const PAID_CALL_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

describe("PostgresCoachingPurchases#recordCompletion", () => {
  it("records the event in the ledger and then the purchase", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([{ id: "evt_1" }]);
    const purchases = createPurchases(database.client);

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({ outcome: "recorded", clientId: "client-1" });
    expect(database.insertedRows).toEqual([
      { id: "evt_1", receivedAt: NOW },
      expect.objectContaining({ assessmentCallId: PAID_CALL_ID }),
      expect.objectContaining({
        clientId: "client-1",
        stripeCheckoutSessionId: "cs_1",
      }),
    ]);
    expect(database.update).toHaveBeenCalledTimes(1);
  });

  it("answers a duplicate event with the client it recorded and writes nothing else when the ledger already holds the event", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([]);
    const purchases = createPurchases(database.client);

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({
      outcome: "duplicate_event",
      clientId: "client-recorded-earlier",
    });
    expect(database.insertedRows).toEqual([{ id: "evt_1", receivedAt: NOW }]);
    expect(database.update).not.toHaveBeenCalled();
  });

  it("refuses a duplicate event whose recorded client cannot be found", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([], {
      recordedClients: [],
    });
    const purchases = createPurchases(database.client);

    // act
    const recording = purchases.recordCompletion(purchase());

    // assert
    await expect(recording).rejects.toThrow(PAID_CALL_ID);
  });

  it("answers an already paid call when the call already has a client", async () => {
    // arrange
    const purchases = createPurchases(
      createDatabaseFailingTransactionWith(
        uniqueViolation("clients_assessment_call_id_unique"),
      ),
    );

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({ outcome: "call_already_paid" });
  });

  it("rethrows any other unique violation", async () => {
    // arrange
    const failure = uniqueViolation(
      "coaching_subscriptions_stripe_subscription_id_unique",
    );
    const purchases = createPurchases(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = purchases.recordCompletion(purchase());

    // assert
    await expect(recording).rejects.toBe(failure);
  });

  it("rethrows a failure that is not a unique violation", async () => {
    // arrange
    const failure = Object.assign(new Error("connection reset"), {
      code: "08006",
      constraint: "clients_assessment_call_id_unique",
    });
    const purchases = createPurchases(
      createDatabaseFailingTransactionWith(failure),
    );

    // act
    const recording = purchases.recordCompletion(purchase());

    // assert
    await expect(recording).rejects.toBe(failure);
  });
});

describe("PostgresCoachingPurchases#forCalls", () => {
  it("answers a state for every requested call, held when nothing is recorded, and lets paid outrank a sent link", async () => {
    // arrange
    const purchases = createPurchases(
      createDatabaseAnsweringSalesRows([
        { assessmentCallId: PAID_CALL_ID, state: "payment-link-sent" },
        { assessmentCallId: LINK_SENT_CALL_ID, state: "payment-link-sent" },
        { assessmentCallId: PAID_CALL_ID, state: "paid" },
      ]),
    );

    // act
    const states = await purchases.forCalls([
      HELD_CALL_ID,
      LINK_SENT_CALL_ID,
      PAID_CALL_ID,
    ]);

    // assert
    expect(Object.fromEntries(states)).toEqual({
      [HELD_CALL_ID]: "held",
      [LINK_SENT_CALL_ID]: "payment-link-sent",
      [PAID_CALL_ID]: "paid",
    });
  });

  it("answers an empty map without querying when no call is asked for", async () => {
    // arrange
    const purchases = createPurchases(createUnreachableDatabase());

    // act
    const states = await purchases.forCalls([]);

    // assert
    expect(states.size).toBe(0);
  });
});

function createPurchases(database: DatabaseClient): PostgresCoachingPurchases {
  return new PostgresCoachingPurchases({
    clock: { now: () => NOW },
    database,
  });
}

function purchase(): CoachingPurchase {
  const call = AssessmentCall.reconstitute({
    id: PAID_CALL_ID,
    firstName: "Ana",
    lastName: "Popescu",
    visitorEmail: "ana@example.com",
    visitorNotes: null,
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone: null,
    startsAt: new Date("2026-10-19T14:00:00.000Z"),
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: "Europe/Bucharest",
    bookedAt: new Date("2026-10-18T09:30:00.000Z"),
  }).toSnapshot();

  return {
    eventId: "evt_1",
    client: Client.fromAssessmentCall(call, NOW),
    subscription: CoachingSubscription.fromCompletedCheckout({
      checkoutSessionId: "cs_1",
      paymentCustomerId: "cus_1",
      paymentSubscriptionId: "sub_1",
      amountCents: 44700,
      currency: "eur",
      customerEmail: "ana@example.com",
      paidAt: NOW,
      assessmentCallId: PAID_CALL_ID,
      bundleId: "3-months",
      tier: "regular",
      startChoice: "waiting",
    }),
  };
}

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key value"), {
    cause: { code: "23505", constraint },
  });
}

function createDatabaseWithLedgerAnswering(
  ledgerRows: readonly unknown[],
  options: { recordedClients: readonly unknown[] } = {
    recordedClients: [{ id: "client-recorded-earlier" }],
  },
) {
  const insertedRows: unknown[] = [];
  const update = vi.fn(() => ({ set: () => ({ where: async () => [] }) }));
  const transaction = {
    insert: () => ({
      values: (row: unknown) => {
        insertedRows.push(row);

        return Object.assign(Promise.resolve(), {
          onConflictDoNothing: () => ({ returning: async () => ledgerRows }),
          returning: async () => [{ id: "client-1" }],
        });
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
  };
  const client = {
    transaction: (work: (tx: unknown) => Promise<unknown>) => work(transaction),
  } as unknown as DatabaseClient;

  return { client, insertedRows, update };
}

function createDatabaseFailingTransactionWith(failure: Error): DatabaseClient {
  return {
    transaction: async () => {
      throw failure;
    },
  } as unknown as DatabaseClient;
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
