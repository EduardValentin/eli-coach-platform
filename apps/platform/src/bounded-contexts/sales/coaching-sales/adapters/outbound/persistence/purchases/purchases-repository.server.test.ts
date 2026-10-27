import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { Client } from "~/bounded-contexts/clients/clients/domain/client";
import {
  PurchasedSubscription,
  type CoachingPurchase,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import { describe, expect, it, vi } from "vitest";

import { PostgresCoachingPurchases } from "./purchases-repository.server";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const PROGRAM_STARTS_AT = new Date("2026-11-03T10:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-20T10:00:00.000Z");
const HELD_CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const LINK_SENT_CALL_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const PAID_CALL_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const CLIENT_ID = "2d3e4f50-6172-4839-9a0b-1c2d3e4f5061";
const ADMITTED_CLIENT_ID = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
const SUBSCRIPTION_ID = "8e9f0a1b-2c3d-4e5f-9a6b-7c8d9e0f1a2b";

describe("PostgresCoachingPurchases#recordCompletion", () => {
  it("records the event in the ledger, admits the client, opens her profile and then records the purchase under the id the domain gave it and her standing in the same transaction", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([{ id: "evt_1" }]);
    const {
      purchases,
      openClientProfile,
      writeClient,
      writeCoachingStanding,
      writersRanIn,
    } = createPurchases(database.client);

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({
      outcome: "recorded",
      clientId: ADMITTED_CLIENT_ID,
    });
    expect(writersRanIn).toEqual([
      database.transaction,
      database.transaction,
      database.transaction,
    ]);
    expect(writeClient).toHaveBeenCalledWith(purchase().client);
    expect(openClientProfile).toHaveBeenCalledWith({
      clientId: ADMITTED_CLIENT_ID,
      at: NOW,
    });
    expect(database.insertedRows).toEqual([
      { id: "evt_1", receivedAt: NOW },
      expect.objectContaining({
        id: SUBSCRIPTION_ID,
        clientId: ADMITTED_CLIENT_ID,
        assessmentCallId: PAID_CALL_ID,
        stripeCheckoutSessionId: "cs_1",
        paidThrough: PAID_THROUGH,
        programStartsAt: PROGRAM_STARTS_AT,
      }),
    ]);
    expect(writeCoachingStanding).toHaveBeenCalledWith({
      clientId: ADMITTED_CLIENT_ID,
      standing: expect.anything(),
    });
    expect(
      writeCoachingStanding.mock.calls[0]?.[0].standing.toSnapshot(),
    ).toEqual({
      status: "not-started",
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: 3,
      programStartsAt: PROGRAM_STARTS_AT,
      paidThrough: PAID_THROUGH,
    });
    expect(database.update).toHaveBeenCalledTimes(1);
  });

  it("answers a duplicate event with the client it recorded and writes nothing else when the ledger already holds the event", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([]);
    const { purchases, openClientProfile, writeClient, writeCoachingStanding } =
      createPurchases(database.client);

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({
      outcome: "duplicate_event",
      clientId: "client-recorded-earlier",
    });
    expect(database.insertedRows).toEqual([{ id: "evt_1", receivedAt: NOW }]);
    expect(writeClient).not.toHaveBeenCalled();
    expect(openClientProfile).not.toHaveBeenCalled();
    expect(writeCoachingStanding).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("refuses a duplicate event whose recorded client cannot be found", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([], {
      recordedClients: [],
    });
    const { purchases } = createPurchases(database.client);

    // act
    const recording = purchases.recordCompletion(purchase());

    // assert
    await expect(recording).rejects.toThrow(PAID_CALL_ID);
  });

  it("answers an already paid call and records nothing more when the call already has a client", async () => {
    // arrange
    const database = createDatabaseWithLedgerAnswering([{ id: "evt_1" }]);
    const { purchases, writeCoachingStanding } = createPurchases(
      database.client,
      { admitted: "call_already_has_client" },
    );

    // act
    const outcome = await purchases.recordCompletion(purchase());

    // assert
    expect(outcome).toEqual({ outcome: "call_already_paid" });
    expect(database.insertedRows).toEqual([{ id: "evt_1", receivedAt: NOW }]);
    expect(writeCoachingStanding).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("rethrows a failure of the purchase transaction", async () => {
    // arrange
    const failure = new Error("connection reset");
    const { purchases } = createPurchases(
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
    const { purchases } = createPurchases(
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
    const states = await purchases.forCalls([
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
    const { purchases } = createPurchases(
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
    const states = await purchases.forCalls([PAID_CALL_ID]);

    // assert
    expect(states.get(PAID_CALL_ID)).toEqual({
      state: "paid",
      clientId: CLIENT_ID,
    });
  });

  it("answers an empty map without querying when no call is asked for", async () => {
    // arrange
    const { purchases } = createPurchases(createUnreachableDatabase());

    // act
    const states = await purchases.forCalls([]);

    // assert
    expect(states.size).toBe(0);
  });
});

function createPurchases(
  database: DatabaseClient,
  options: { admitted?: "written" | "call_already_has_client" } = {},
) {
  const writersRanIn: unknown[] = [];
  const writingInTransaction = (answer: unknown) =>
    vi.fn().mockImplementation(async () => {
      writersRanIn.push(executorOf(database));

      return answer;
    });
  const writeClient = writingInTransaction(options.admitted ?? "written");
  const writeCoachingStanding = writingInTransaction(undefined);
  const openClientProfile = writingInTransaction(undefined);
  const purchases = new PostgresCoachingPurchases({
    clock: { now: () => NOW },
    database,
    openClientProfile,
    writeClient,
    writeCoachingStanding,
  });

  return {
    purchases,
    openClientProfile,
    writeClient,
    writeCoachingStanding,
    writersRanIn,
  };
}

function purchase(): CoachingPurchase {
  return {
    eventId: "evt_1",
    receivedAt: NOW,
    client: Client.admitted({
      id: ADMITTED_CLIENT_ID,
      intake: {
        assessmentCallId: PAID_CALL_ID,
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        primaryGoal: "build_strength",
        country: "RO",
        phone: null,
        bookingTimeZone: "Europe/Bucharest",
      },
      at: NOW,
    }),
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

function createDatabaseWithLedgerAnswering(
  ledgerRows: readonly unknown[],
  options: { recordedClients: readonly unknown[] } = {
    recordedClients: [{ clientId: "client-recorded-earlier" }],
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

  return { client, insertedRows, transaction, update };
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
