import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { PostgresCoachingSubscriptions } from "./subscriptions-repository.server";

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const CANCELLED_AT = new Date("2026-10-01T10:00:00.000Z");
const ACCESS_ENDS_AT = new Date("2026-12-26T10:00:00.000Z");
const PROBLEM_AT = new Date("2026-10-02T10:00:00.000Z");

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
    const subscriptions = new PostgresCoachingSubscriptions({
      clock: { now: () => PROBLEM_AT },
      database: database.client,
    });
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
      `("app"."coaching_subscriptions"."id" = $1 and "app"."coaching_subscriptions"."status" = $2 and "app"."coaching_subscriptions"."start_choice" = $3 and "app"."coaching_subscriptions"."cancelled_at" = $4 and "app"."coaching_subscriptions"."access_ends_at" = $5 and "app"."coaching_subscriptions"."payment_problem_since" is null and "app"."coaching_subscriptions"."refunded_cents" is null)`,
    );
  });
});

function createDatabaseUpdating() {
  const conditions: unknown[] = [];
  const client = {
    update: () => {
      const statement = {
        set: () => statement,
        where: (condition: unknown) => {
          conditions.push(condition);

          return statement;
        },
        returning: () => Promise.resolve([{ id: "written" }]),
      };

      return statement;
    },
  } as unknown as DatabaseClient;

  return { client, conditions };
}
