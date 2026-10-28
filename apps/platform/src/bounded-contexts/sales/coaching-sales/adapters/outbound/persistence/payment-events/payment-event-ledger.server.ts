import type { DatabaseClient } from "~/shared/database";
import { createUnitOfWork, executorOf } from "~/shared/database/index.server";

import { paymentEventsTable } from "./payment-events-schema.server";

type PaymentEventEntry = {
  eventId: string;
  receivedAt: Date;
};

type PaymentEventWrite = PaymentEventEntry & {
  write: () => Promise<boolean>;
};

class StaleEventWrite extends Error {}

export async function recordPaymentEvent(
  database: DatabaseClient,
  entry: PaymentEventEntry,
): Promise<"recorded" | "duplicate"> {
  const inserted = await executorOf(database)
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
    return await createUnitOfWork(database)(async () => {
      if ((await recordPaymentEvent(database, entry)) === "duplicate") {
        return "duplicate";
      }

      if (!(await write())) {
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
