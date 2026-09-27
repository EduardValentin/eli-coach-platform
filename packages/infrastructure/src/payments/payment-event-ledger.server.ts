import type { DatabaseTransaction } from "@eli-coach-platform/db";

import { paymentEventsTable } from "./payment-events-schema.server";

type PaymentEventEntry = {
  eventId: string;
  receivedAt: Date;
};

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
