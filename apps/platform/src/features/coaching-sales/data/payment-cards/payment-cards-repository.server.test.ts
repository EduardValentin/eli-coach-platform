import type { DatabaseClient } from "@eli-coach-platform/db";
import { PaymentCard } from "@eli-coach-platform/domain/coaching-subscription";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { PostgresPaymentCards } from "./payment-cards-repository.server";

const NOW = new Date("2026-10-04T10:00:00.000Z");

const VISA = PaymentCard.of({
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_visa",
});

const MASTERCARD = PaymentCard.of({
  brand: "mastercard",
  lastFour: "4444",
  expiryMonth: 3,
  expiryYear: 2031,
  paymentMethodId: "pm_mastercard",
});

const dialect = new PgDialect();

describe("PostgresPaymentCards#save", () => {
  it("replaces the card only while the stored row still holds the card it was decided on", async () => {
    // arrange
    const database = createDatabaseWriting([{ stripeCustomerId: "cus_1" }]);
    const cards = new PostgresPaymentCards({
      clock: { now: () => NOW },
      database: database.client,
    });

    // act
    const outcome = await cards.save({
      paymentCustomerId: "cus_1",
      card: MASTERCARD,
      previous: VISA,
    });

    // assert
    expect(outcome).toBe("saved");
    const [condition] = database.conditions;
    expect(dialect.sqlToQuery(condition as SQL).sql).toBe(
      `("app"."payment_cards"."stripe_customer_id" = $1 and "app"."payment_cards"."payment_method_id" = $2 and "app"."payment_cards"."brand" = $3 and "app"."payment_cards"."last_four" = $4 and "app"."payment_cards"."expiry_month" = $5 and "app"."payment_cards"."expiry_year" = $6)`,
    );
  });

  it("answers stale when another write changed the card meanwhile", async () => {
    // arrange
    const database = createDatabaseWriting([]);
    const cards = new PostgresPaymentCards({
      clock: { now: () => NOW },
      database: database.client,
    });

    // act
    const outcome = await cards.save({
      paymentCustomerId: "cus_1",
      card: null,
      previous: VISA,
    });

    // assert
    expect(outcome).toBe("stale");
  });
});

function createDatabaseWriting(written: readonly unknown[]) {
  const conditions: unknown[] = [];
  const statement = {
    set: () => statement,
    where: (condition: unknown) => {
      conditions.push(condition);

      return statement;
    },
    returning: () => Promise.resolve(written),
  };
  const client = {
    update: () => statement,
    delete: () => statement,
  } as unknown as DatabaseClient;

  return { client, conditions };
}
