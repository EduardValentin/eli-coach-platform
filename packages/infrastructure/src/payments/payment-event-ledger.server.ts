import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";

import { paymentEventsTable } from "./payment-events-schema.server";

type PaymentEventEntry = {
  eventId: string;
  receivedAt: Date;
};

type PaymentEventWrite = PaymentEventEntry & {
  write: (transaction: DatabaseTransaction) => Promise<boolean>;
};

class StaleEventWrite extends Error {}

export async function recordPaymentEvent(
  transaction: DatabaseTransaction,
  entry: PaymentEventEntry,
): Promise<"recorded" | "duplicate"> {
  const inserted = await transaction
    .insert(paymentEventsTable)
    .values({ id: entry.eventId, receivedAt: entry.receivedAt })
    .onConflictDoNothing({ target: paymentEventsTable.id })
    .returning({ id: paymentEventsTable.id });

  return inserted.length === 0 ? "duplicate" : "recorded";
}

export async function recordEventOnce(
  database: DatabaseClient,
  { write, ...entry }: PaymentEventWrite,
): Promise<"recorded" | "duplicate" | "stale"> {
  try {
    return await database.transaction(async (transaction) => {
      if ((await recordPaymentEvent(transaction, entry)) === "duplicate") {
        return "duplicate";
      }

      if (!(await write(transaction))) {
        throw new StaleEventWrite();
      }

      return "recorded";
    });
  } catch (error) {
    if (error instanceof StaleEventWrite) {
      return "stale";
    }

    throw error;
  }
}
