import { index, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./feature-flags";

export const waitlistEntriesTable = appSchema.table(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    pricingEligibility: varchar("pricing_eligibility", { length: 32 }).notNull().default("reduced"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("waitlist_entries_created_at_idx").on(table.createdAt),
    index("waitlist_entries_pricing_eligibility_idx").on(table.pricingEligibility),
  ],
);
