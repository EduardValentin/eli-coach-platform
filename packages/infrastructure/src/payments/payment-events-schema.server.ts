import { appSchema } from "@eli-coach-platform/db";
import { timestamp, varchar } from "drizzle-orm/pg-core";

export const paymentEventsTable = appSchema.table("payment_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
});
