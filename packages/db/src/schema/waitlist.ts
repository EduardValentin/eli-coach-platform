import { index, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./app-schema";

export const waitlistEntriesTable = appSchema.table(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    campaignSlug: varchar("offer_slug", { length: 96 }).notNull().default("all-bundles-launch-1"),
    offerPlan: varchar("offer_plan", { length: 32 }).notNull().default("all-bundles"),
    pricingEligibility: varchar("pricing_eligibility", { length: 32 }).notNull().default("reduced"),
    privacyPolicyVersion: varchar("privacy_policy_version", { length: 64 }).notNull(),
    marketingConsentVersion: varchar("marketing_consent_version", { length: 64 }).notNull(),
    marketingConsentedAt: timestamp("marketing_consented_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("waitlist_entries_created_at_idx").on(table.createdAt),
    index("waitlist_entries_offer_slug_idx").on(table.campaignSlug),
    index("waitlist_entries_pricing_eligibility_idx").on(table.pricingEligibility),
    uniqueIndex("waitlist_entries_email_offer_unique").on(table.email, table.campaignSlug),
  ],
);
