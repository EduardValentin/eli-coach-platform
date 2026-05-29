import { index, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./feature-flags";

export const waitlistEntriesTable = appSchema.table(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    offerSlug: varchar("offer_slug", { length: 96 }).notNull().default("12-months-launch-1"),
    offerPlan: varchar("offer_plan", { length: 32 }).notNull().default("12-months"),
    pricingEligibility: varchar("pricing_eligibility", { length: 32 }).notNull().default("reduced"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("waitlist_entries_created_at_idx").on(table.createdAt),
    index("waitlist_entries_offer_slug_idx").on(table.offerSlug),
    index("waitlist_entries_pricing_eligibility_idx").on(table.pricingEligibility),
    uniqueIndex("waitlist_entries_email_offer_unique").on(table.email, table.offerSlug),
  ],
);
