import type { DatabaseClient, DatabaseExecutor } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  PaymentCard,
  type PaymentCardWrite,
  type PaymentCardEventWrite,
  type PaymentCards,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { Clock } from "~/bounded-contexts/sales/coaching-sales/domain/clock";
import { recordEventOnce } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-ledger.server";
import { and, eq, type SQL } from "drizzle-orm";

import { paymentCardsTable } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/persistence/schema.server";

type PostgresPaymentCardsOptions = {
  clock: Clock;
  database: DatabaseClient;
};

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

  private get executor() {
    return executorOf(this.options.database);
  }

  async findByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<PaymentCard | null> {
    const [row] = await this.executor
      .select(cardColumns)
      .from(paymentCardsTable)
      .where(eq(paymentCardsTable.stripeCustomerId, paymentCustomerId))
      .limit(1);

    return row ? PaymentCard.of(row) : null;
  }

  async save(change: PaymentCardWrite): Promise<"saved" | "stale"> {
    const written = await writeCard(this.executor, {
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
      write: () => writeCard(this.executor, { change, updatedAt: receivedAt }),
    });
  }
}

function writeCard(
  database: DatabaseExecutor,
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
  database: DatabaseExecutor,
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
  database: DatabaseExecutor,
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
  database: DatabaseExecutor,
  write: StampedCardWrite & { previous: PaymentCard },
): Promise<boolean> {
  const removed = await database
    .delete(paymentCardsTable)
    .where(stillHolds(write.change.paymentCustomerId, write.previous))
    .returning({ stripeCustomerId: paymentCardsTable.stripeCustomerId });

  return removed.length > 0;
}

async function hasNoCard(
  database: DatabaseExecutor,
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
