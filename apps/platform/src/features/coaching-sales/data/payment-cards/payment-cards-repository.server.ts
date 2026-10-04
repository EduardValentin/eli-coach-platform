import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  PaymentCard,
  type PaymentCardWrite,
  type PaymentCardEventWrite,
  type PaymentCards,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { Clock } from "@eli-coach-platform/domain/shared";
import { recordEventOnce } from "@eli-coach-platform/infrastructure/payments/server";
import { and, eq, type SQL } from "drizzle-orm";

import { paymentCardsTable } from "~/features/coaching-sales/data/schema.server";

type PostgresPaymentCardsOptions = {
  clock: Clock;
  database: DatabaseClient;
};

type Database = DatabaseClient | DatabaseTransaction;

type StampedCardWrite = {
  change: PaymentCardWrite;
  updatedAt: Date;
};

const cardColumns = {
  paymentMethodId: paymentCardsTable.paymentMethodId,
  brand: paymentCardsTable.brand,
  lastFour: paymentCardsTable.lastFour,
  expiryMonth: paymentCardsTable.expiryMonth,
  expiryYear: paymentCardsTable.expiryYear,
};

export class PostgresPaymentCards implements PaymentCards {
  constructor(private readonly options: PostgresPaymentCardsOptions) {}

  async findByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<PaymentCard | null> {
    const [row] = await this.options.database
      .select(cardColumns)
      .from(paymentCardsTable)
      .where(eq(paymentCardsTable.stripeCustomerId, paymentCustomerId))
      .limit(1);

    return row ? PaymentCard.of(row) : null;
  }

  async save(change: PaymentCardWrite): Promise<"saved" | "stale"> {
    const written = await writeCard(this.options.database, {
      change,
      updatedAt: this.options.clock.now(),
    });

    return written ? "saved" : "stale";
  }

  saveForEvent(
    change: PaymentCardEventWrite,
  ): Promise<"recorded" | "duplicate" | "stale"> {
    const receivedAt = this.options.clock.now();

    return recordEventOnce(this.options.database, {
      eventId: change.eventId,
      receivedAt,
      write: (transaction) =>
        writeCard(transaction, { change, updatedAt: receivedAt }),
    });
  }
}

function writeCard(
  database: Database,
  write: StampedCardWrite,
): Promise<boolean> {
  const { card, previous } = write.change;

  if (!previous) {
    return card
      ? insertCard(database, { ...write, card })
      : hasNoCard(database, write.change.paymentCustomerId);
  }

  return card
    ? replaceCard(database, { ...write, card, previous })
    : removeCard(database, { ...write, previous });
}

async function insertCard(
  database: Database,
  write: StampedCardWrite & { card: PaymentCard },
): Promise<boolean> {
  const inserted = await database
    .insert(paymentCardsTable)
    .values({
      stripeCustomerId: write.change.paymentCustomerId,
      ...write.card.toSnapshot(),
      updatedAt: write.updatedAt,
    })
    .onConflictDoNothing()
    .returning({ stripeCustomerId: paymentCardsTable.stripeCustomerId });

  return inserted.length > 0;
}

async function replaceCard(
  database: Database,
  write: StampedCardWrite & { card: PaymentCard; previous: PaymentCard },
): Promise<boolean> {
  const replaced = await database
    .update(paymentCardsTable)
    .set({ ...write.card.toSnapshot(), updatedAt: write.updatedAt })
    .where(stillHolds(write.change.paymentCustomerId, write.previous))
    .returning({ stripeCustomerId: paymentCardsTable.stripeCustomerId });

  return replaced.length > 0;
}

async function removeCard(
  database: Database,
  write: StampedCardWrite & { previous: PaymentCard },
): Promise<boolean> {
  const removed = await database
    .delete(paymentCardsTable)
    .where(stillHolds(write.change.paymentCustomerId, write.previous))
    .returning({ stripeCustomerId: paymentCardsTable.stripeCustomerId });

  return removed.length > 0;
}

async function hasNoCard(
  database: Database,
  paymentCustomerId: string,
): Promise<boolean> {
  const rows = await database
    .select({ stripeCustomerId: paymentCardsTable.stripeCustomerId })
    .from(paymentCardsTable)
    .where(eq(paymentCardsTable.stripeCustomerId, paymentCustomerId))
    .limit(1);

  return rows.length === 0;
}

function stillHolds(
  paymentCustomerId: string,
  previous: PaymentCard,
): SQL | undefined {
  const card = previous.toSnapshot();

  return and(
    eq(paymentCardsTable.stripeCustomerId, paymentCustomerId),
    eq(paymentCardsTable.paymentMethodId, card.paymentMethodId),
    eq(paymentCardsTable.brand, card.brand),
    eq(paymentCardsTable.lastFour, card.lastFour),
    eq(paymentCardsTable.expiryMonth, card.expiryMonth),
    eq(paymentCardsTable.expiryYear, card.expiryYear),
  );
}
