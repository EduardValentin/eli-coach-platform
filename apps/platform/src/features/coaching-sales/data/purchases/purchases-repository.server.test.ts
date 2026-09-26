import type { DatabaseClient } from "@eli-coach-platform/db";
import { AssessmentCall } from "@eli-coach-platform/domain/assessment-call";
import { Client } from "@eli-coach-platform/domain/client";
import {
  CoachingSubscription,
  type CoachingPurchase,
} from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import { PostgresCoachingPurchases } from "./purchases-repository.server";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const HELD_CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const LINK_SENT_CALL_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const PAID_CALL_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

describe("PostgresCoachingPurchases#recordCompletion", () => {
  it("records a purchase the database accepts", async () => {
    // arrange
    const purchases = createPurchases(createDatabaseCommittingTransaction());

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toBe("recorded");
  });

  it("answers a duplicate event when the event ledger already holds the event", async () => {
    // arrange
    const purchases = createPurchases(
      createDatabaseFailingTransactionWith(
        uniqueViolation("payment_events_pkey"),
      ),
    );

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toBe("duplicate_event");
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
    expect(outcome).toBe("call_already_paid");
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
      constraint: "payment_events_pkey",
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
  it("answers held for every call without a valid link or a client, and lets paid outrank a sent link", async () => {
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

function createDatabaseCommittingTransaction(): DatabaseClient {
  return { transaction: async () => undefined } as unknown as DatabaseClient;
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
