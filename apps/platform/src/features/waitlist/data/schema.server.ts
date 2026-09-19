import {
  check,
  index,
  integer,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { appSchema } from "@eli-coach-platform/db";
import { WAITLIST_REDUCED_PRICING_CAP } from "@eli-coach-platform/domain/waitlist";

export const waitlistEntryConstraints = {
  emailPerOffer: "waitlist_entries_email_offer_unique",
  reducedSlotPerOffer: "waitlist_entries_offer_reduced_slot_unique",
  reducedSlotRange: "waitlist_entries_reduced_slot_range",
  reducedSlotMatchesPricing: "waitlist_entries_reduced_slot_matches_pricing",
} as const;

export const waitlistEntriesTable = appSchema.table(
  "waitlist_entries",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    campaignSlug: varchar("offer_slug", { length: 96 })
      .notNull()
      .default("all-bundles-launch-1"),
    offerPlan: varchar("offer_plan", { length: 32 })
      .notNull()
      .default("all-bundles"),
    pricingEligibility: varchar("pricing_eligibility", {
      length: 32,
    }).notNull(),
    reducedSlot: integer("reduced_slot"),
    privacyPolicyVersion: varchar("privacy_policy_version", {
      length: 64,
    }).notNull(),
    marketingConsentVersion: varchar("marketing_consent_version", {
      length: 64,
    }).notNull(),
    marketingConsentedAt: timestamp("marketing_consented_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("waitlist_entries_created_at_idx").on(table.createdAt),
    index("waitlist_entries_offer_slug_idx").on(table.campaignSlug),
    index("waitlist_entries_pricing_eligibility_idx").on(
      table.pricingEligibility,
    ),
    uniqueIndex(waitlistEntryConstraints.emailPerOffer).on(
      table.email,
      table.campaignSlug,
    ),
    uniqueIndex(waitlistEntryConstraints.reducedSlotPerOffer).on(
      table.campaignSlug,
      table.reducedSlot,
    ),
    check(
      waitlistEntryConstraints.reducedSlotRange,
      sql`${table.reducedSlot} between 1 and ${sql.raw(String(WAITLIST_REDUCED_PRICING_CAP))}`,
    ),
    check(
      waitlistEntryConstraints.reducedSlotMatchesPricing,
      sql`(${table.pricingEligibility} = 'reduced') = (${table.reducedSlot} is not null)`,
    ),
  ],
);
