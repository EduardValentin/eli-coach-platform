import {
  type WaitlistRepository,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
} from "@eli-coach-platform/domain";
import { count, eq, sql } from "drizzle-orm";
import type { QueryResult } from "pg";
import type { DatabaseClient } from "../database-client";
import { waitlistEntriesTable } from "../schema";

type ReservationRow = {
  emailExists: boolean;
  entryCount: number;
  inserted: boolean;
};

type RegularPricingSignupRow = {
  inserted: boolean;
};

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";

export class PostgresWaitlistRepository implements WaitlistRepository {
  constructor(private readonly database: DatabaseClient) {}

  async countReducedPricingSignups(): Promise<number> {
    const [result] = await this.database
      .select({ entryCount: count() })
      .from(waitlistEntriesTable)
      .where(eq(waitlistEntriesTable.pricingEligibility, "reduced"));

    return result?.entryCount ?? 0;
  }

  async registerRegularPricingSignup(options: {
    normalizedEmail: string;
  }): Promise<RegularPricingSignupResult> {
    const result = await this.database.execute<RegularPricingSignupRow>(sql`
      with attempted_insert as (
        insert into app.waitlist_entries (email, pricing_eligibility)
        values (${options.normalizedEmail}, 'regular')
        on conflict (email) do nothing
        returning id
      )
      select exists(select 1 from attempted_insert) as "inserted"
    `);
    const [row] = result.rows;

    if (!row) {
      throw new Error("Regular pricing waitlist signup query returned no rows.");
    }

    return row.inserted ? { status: "registered" } : { status: "already_registered" };
  }

  async registerReducedPricingSignup(options: {
    cap: number;
    normalizedEmail: string;
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
  }): Promise<ReducedPricingSignupResult> {
    return this.database.transaction(
      async (transaction) => {
        const result = await transaction.execute<ReservationRow>(sql`
          with capacity as (
            select count(*)::int as entry_count
            from app.waitlist_entries
            where pricing_eligibility = 'reduced'
          ),
          attempted_insert as (
            insert into app.waitlist_entries (email, pricing_eligibility)
            select ${options.normalizedEmail}
              , 'reduced'
            from capacity
            where capacity.entry_count < ${options.cap}
            on conflict (email) do nothing
            returning id
          )
          select
            exists(select 1 from attempted_insert) as "inserted",
            exists(
              select 1
              from app.waitlist_entries
              where email = ${options.normalizedEmail}
            ) as "emailExists",
            (
              (select entry_count from capacity) +
              (select count(*)::int from attempted_insert)
            ) as "entryCount"
        `);
        const row = getSingleReservationRow(result);

        if (row.inserted) {
          return {
            status: "registered",
            spotsRemaining: Math.max(options.cap - row.entryCount, 0),
          };
        }

        return row.emailExists ? { status: "already_registered" } : { status: "capacity_reached" };
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
