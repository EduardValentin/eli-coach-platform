import { index, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./feature-flags";

export const waitlistEntriesTable = appSchema.table(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("waitlist_entries_created_at_idx").on(table.createdAt)],
);
