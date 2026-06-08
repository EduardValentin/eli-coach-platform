import {
  type WaitlistRepository,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
  type WaitlistOffer,
  type WaitlistSignupPricing,
} from "@eli-coach-platform/domain";
import { and, count, eq, sql } from "drizzle-orm";
import type { QueryResult } from "pg";
import type { DatabaseClient } from "../database-client";
import { waitlistEntriesTable } from "../schema";

type ReservationRow = {
  existingPricing: WaitlistSignupPricing | null;
  entryCount: number;
  inserted: boolean;
  upgraded: boolean;
};

type RegularPricingSignupRow = {
  inserted: boolean;
  pricing: WaitlistSignupPricing;
};

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";

export class PostgresWaitlistRepository implements WaitlistRepository {
  constructor(private readonly database: DatabaseClient) {}

  async countReducedPricingSignups(options: { campaignSlug: string }): Promise<number> {
    const [result] = await this.database
      .select({ entryCount: count() })
      .from(waitlistEntriesTable)
      .where(
        and(
          eq(waitlistEntriesTable.campaignSlug, options.campaignSlug),
          eq(waitlistEntriesTable.pricingEligibility, "reduced"),
        ),
      );

    return result?.entryCount ?? 0;
  }

  async registerRegularPricingSignup(options: {
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<RegularPricingSignupResult> {
    const result = await this.database.execute<RegularPricingSignupRow>(sql`
      with attempted_insert as (
        insert into app.waitlist_entries (email, offer_slug, offer_plan, pricing_eligibility)
        values (${options.normalizedEmail}, ${options.offer.campaignSlug}, ${options.offer.plan}, 'regular')
        on conflict (email, offer_slug) do nothing
        returning pricing_eligibility
      ),
      resolved_entry as (
        select pricing_eligibility
        from attempted_insert
        union all
        select pricing_eligibility
        from app.waitlist_entries
        where email = ${options.normalizedEmail}
          and offer_slug = ${options.offer.campaignSlug}
          and not exists(select 1 from attempted_insert)
      )
      select
        exists(select 1 from attempted_insert) as "inserted",
        (select pricing_eligibility from resolved_entry limit 1) as "pricing"
    `);
    const [row] = result.rows;

    if (!row) {
      throw new Error("Regular pricing waitlist signup query returned no rows.");
    }

    return row.inserted
      ? { status: "registered" }
      : { pricing: row.pricing, status: "already_registered" };
  }

  async registerReducedPricingSignup(options: {
    cap: number;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<ReducedPricingSignupResult> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await this.registerReducedPricingSignupInSerializableTransaction(options);
      } catch (error) {
        if (!isDatabaseErrorCode(error, SERIALIZATION_FAILURE_CODE)) {
          throw error;
        }

        if (attempt === MAX_SERIALIZATION_RETRIES) {
          throw error;
        }
      }
    }

    throw new Error("Reduced pricing waitlist signup retry loop exited unexpectedly.");
  }

  private async registerReducedPricingSignupInSerializableTransaction(options: {
    cap: number;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<ReducedPricingSignupResult> {
    return this.database.transaction(
      async (transaction) => {
        const result = await transaction.execute<ReservationRow>(sql`
          with existing_entry as (
            select pricing_eligibility
            from app.waitlist_entries
            where email = ${options.normalizedEmail}
              and offer_slug = ${options.offer.campaignSlug}
          ),
          capacity as (
            select count(*)::int as entry_count
            from app.waitlist_entries
            where offer_slug = ${options.offer.campaignSlug}
              and pricing_eligibility = 'reduced'
          ),
          upgraded_entry as (
            update app.waitlist_entries
            set pricing_eligibility = 'reduced',
              offer_plan = ${options.offer.plan}
            where email = ${options.normalizedEmail}
              and offer_slug = ${options.offer.campaignSlug}
              and pricing_eligibility = 'regular'
              and (select entry_count from capacity) < ${options.cap}
            returning id
          ),
          attempted_insert as (
            insert into app.waitlist_entries (email, offer_slug, offer_plan, pricing_eligibility)
            select ${options.normalizedEmail},
              ${options.offer.campaignSlug},
              ${options.offer.plan},
              'reduced'
            from capacity
            where capacity.entry_count < ${options.cap}
              and not exists(select 1 from existing_entry)
            on conflict (email, offer_slug) do nothing
            returning id
          )
          select
            exists(select 1 from attempted_insert) as "inserted",
            exists(select 1 from upgraded_entry) as "upgraded",
            (select pricing_eligibility from existing_entry limit 1) as "existingPricing",
            (
              (select entry_count from capacity) +
              (select count(*)::int from attempted_insert) +
              (select count(*)::int from upgraded_entry)
            ) as "entryCount"
        `);
        const row = getSingleReservationRow(result);

        if (row.inserted || row.upgraded) {
          return {
            status: "registered",
            spotsRemaining: Math.max(options.cap - row.entryCount, 0),
          };
        }

        return row.existingPricing
          ? { pricing: row.existingPricing, status: "already_registered" }
          : { status: "capacity_reached" };
      },
      { isolationLevel: "serializable" },
    );
  }
}

function getSingleReservationRow(result: QueryResult<ReservationRow>): ReservationRow {
  const [row] = result.rows;

  if (!row) {
    throw new Error("Waitlist reservation query returned no rows.");
  }

  return row;
}

function isDatabaseErrorCode(error: unknown, code: string): boolean {
  return getDatabaseErrorCode(error) === code;
}

function getDatabaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }

  if ("cause" in error) {
    return getDatabaseErrorCode((error as { cause?: unknown }).cause);
  }

  return null;
}
