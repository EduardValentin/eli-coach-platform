import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import { PostgresCoachingSubscriptions } from "./subscriptions-repository.server";

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const CANCELLED_AT = new Date("2026-10-01T10:00:00.000Z");
const ACCESS_ENDS_AT = new Date("2026-12-26T10:00:00.000Z");
const PROBLEM_AT = new Date("2026-10-02T10:00:00.000Z");
const PAID_THROUGH = new Date("2026-12-26T10:00:00.000Z");
const RENEWED_THROUGH = new Date("2027-03-26T10:00:00.000Z");

const dialect = new PgDialect();

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscription {
  return CoachingSubscription.reconstitute({
    id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: PAID_AT,
    paidThrough: PAID_THROUGH,
    programStartsAt: PAID_AT,
    startChoice: "immediate",
    status: "cancelled",
    cancelledAt: CANCELLED_AT,
    accessEndsAt: ACCESS_ENDS_AT,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  });
}

describe("PostgresCoachingSubscriptions#save", () => {
  it("writes only while the stored row still holds every value the change was decided on", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions } = createSubscriptions(database.client);
    const previous = subscriptionOf();

    // act
    const outcome = await subscriptions.save({
      subscription: previous.flagPaymentProblem(PROBLEM_AT),
      previous,
    });

    // assert
    expect(outcome).toBe("saved");
    const [condition] = database.conditions;
    expect(dialect.sqlToQuery(condition as SQL).sql).toBe(
      `("app"."coaching_subscriptions"."id" = $1 and "app"."coaching_subscriptions"."status" = $2 and "app"."coaching_subscriptions"."start_choice" = $3 and "app"."coaching_subscriptions"."paid_through" = $4 and "app"."coaching_subscriptions"."program_starts_at" = $5 and "app"."coaching_subscriptions"."cancelled_at" = $6 and "app"."coaching_subscriptions"."access_ends_at" = $7 and "app"."coaching_subscriptions"."payment_problem_since" is null and "app"."coaching_subscriptions"."refunded_cents" is null)`,
    );
  });

  it("writes the renewed paid-through date", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions } = createSubscriptions(database.client);
    const previous = subscriptionOf({
      status: "active",
      cancelledAt: null,
      accessEndsAt: null,
    });

    // act
    await subscriptions.save({
      subscription: previous.renewalPaid(RENEWED_THROUGH),
      previous,
    });

    // assert
    expect(database.writes).toEqual([{ paidThrough: RENEWED_THROUGH }]);
  });

  it("writes the program start moved by an early start", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions } = createSubscriptions(database.client);
    const waiting = {
      status: "not-started",
      cancelledAt: null,
      accessEndsAt: null,
    } as const;
    const previous = subscriptionOf({
      ...waiting,
      startChoice: "waiting",
      programStartsAt: new Date("2026-10-10T10:00:00.000Z"),
    });
    const subscription = subscriptionOf({
      ...waiting,
      startChoice: "immediate",
      programStartsAt: PROBLEM_AT,
    });

    // act
    await subscriptions.save({ subscription, previous });

    // assert
    expect(database.writes).toEqual([
      { startChoice: "immediate", programStartsAt: PROBLEM_AT },
    ]);
  });

  it("copies the saved subscription's standing onto her client in the same transaction", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions, standingWrittenIn, writeCoachingStanding } =
      createSubscriptions(database.client);
    const previous = subscriptionOf({
      status: "active",
      cancelledAt: null,
      accessEndsAt: null,
    });
    const cancelled = subscriptionOf();

    // act
    await subscriptions.save({ subscription: cancelled, previous });

    // assert
    expect(standingWrittenIn).toEqual([database.transaction]);
    expect(writeCoachingStanding).toHaveBeenCalledWith({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      standing: expect.anything(),
    });
    expect(
      writeCoachingStanding.mock.calls[0]?.[0].standing.toSnapshot(),
    ).toEqual(cancelled.standing().toSnapshot());
  });

  it("copies the standing again when the change leaves every column as it was", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions, writeCoachingStanding } = createSubscriptions(
      database.client,
    );
    const unchanged = subscriptionOf();

    // act
    const outcome = await subscriptions.save({
      subscription: unchanged,
      previous: unchanged,
    });

    // assert
    expect(outcome).toBe("saved");
    expect(database.conditions).toEqual([]);
    expect(writeCoachingStanding).toHaveBeenCalledTimes(1);
  });

  it("copies no standing when the stored row no longer holds what the change was decided on", async () => {
    // arrange
    const database = createDatabaseUpdating({ written: [] });
    const { subscriptions, writeCoachingStanding } = createSubscriptions(
      database.client,
    );
    const previous = subscriptionOf();

    // act
    const outcome = await subscriptions.save({
      subscription: previous.flagPaymentProblem(PROBLEM_AT),
      previous,
    });

    // assert
    expect(outcome).toBe("stale");
    expect(writeCoachingStanding).not.toHaveBeenCalled();
  });
});

describe("PostgresCoachingSubscriptions#saveForEvent", () => {
  it("copies the reconciled subscription's standing onto her client in the transaction that records the event", async () => {
    // arrange
    const database = createDatabaseUpdating();
    const { subscriptions, standingWrittenIn, writeCoachingStanding } =
      createSubscriptions(database.client);
    const previous = subscriptionOf({
      status: "active",
      cancelledAt: null,
      accessEndsAt: null,
    });
    const cancelled = subscriptionOf();

    // act
    const outcome = await subscriptions.saveForEvent({
      eventId: "evt_1",
      subscription: cancelled,
      previous,
    });

    // assert
    expect(outcome).toBe("recorded");
    expect(database.recordedEvents).toEqual(["evt_1"]);
    expect(standingWrittenIn).toEqual([database.transaction]);
    expect(writeCoachingStanding).toHaveBeenCalledWith({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      standing: expect.anything(),
    });
    expect(
      writeCoachingStanding.mock.calls[0]?.[0].standing.toSnapshot(),
    ).toEqual(cancelled.standing().toSnapshot());
  });

  it("copies no standing for an event decided on a row that has changed since", async () => {
    // arrange
    const database = createDatabaseUpdating({ written: [] });
    const { subscriptions, writeCoachingStanding } = createSubscriptions(
      database.client,
    );
    const previous = subscriptionOf();

    // act
    const outcome = await subscriptions.saveForEvent({
      eventId: "evt_2",
      subscription: previous.flagPaymentProblem(PROBLEM_AT),
      previous,
    });

    // assert
    expect(outcome).toBe("stale");
    expect(writeCoachingStanding).not.toHaveBeenCalled();
  });

  it("writes neither the subscription nor the standing for an event the ledger already holds", async () => {
    // arrange
    const database = createDatabaseUpdating({
      written: [{ id: "written" }],
      heldEvents: ["evt_3"],
    });
    const { subscriptions, writeCoachingStanding } = createSubscriptions(
      database.client,
    );
    const previous = subscriptionOf();

    // act
    const outcome = await subscriptions.saveForEvent({
      eventId: "evt_3",
      subscription: previous.flagPaymentProblem(PROBLEM_AT),
      previous,
    });

    // assert
    expect(outcome).toBe("duplicate");
    expect(database.conditions).toEqual([]);
    expect(writeCoachingStanding).not.toHaveBeenCalled();
  });
});

function createSubscriptions(database: DatabaseClient) {
  const standingWrittenIn: unknown[] = [];
  const writeCoachingStanding = vi.fn().mockImplementation(async () => {
    standingWrittenIn.push(executorOf(database));
  });
  const subscriptions = new PostgresCoachingSubscriptions({
    clock: { now: () => PROBLEM_AT },
    database,
    standings: { record: writeCoachingStanding },
  });

  return { subscriptions, standingWrittenIn, writeCoachingStanding };
}

function createDatabaseUpdating(
  options: { written: readonly unknown[]; heldEvents?: readonly string[] } = {
    written: [{ id: "written" }],
  },
) {
  const conditions: unknown[] = [];
  const writes: unknown[] = [];
  const recordedEvents: string[] = [];
  const transaction = {
    insert: () => ({
      values: (entry: { id: string }) => ({
        onConflictDoNothing: () => ({
          returning: () => {
            if (options.heldEvents?.includes(entry.id)) {
              return Promise.resolve([]);
            }

            recordedEvents.push(entry.id);

            return Promise.resolve([{ id: entry.id }]);
          },
        }),
      }),
    }),
    update: () => {
      const statement = {
        set: (columns: unknown) => {
          writes.push(columns);

          return statement;
        },
        where: (condition: unknown) => {
          conditions.push(condition);

          return statement;
        },
        returning: () => Promise.resolve(options.written),
      };

      return statement;
    },
  };
  const client = {
    transaction: (work: (tx: unknown) => Promise<unknown>) => work(transaction),
  } as unknown as DatabaseClient;

  return { client, conditions, writes, recordedEvents, transaction };
}
