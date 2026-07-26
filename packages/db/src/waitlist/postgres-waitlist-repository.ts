import {
  type WaitlistRepository,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
} from "@eli-coach-platform/domain";
import { and, count, eq, lt, sql } from "drizzle-orm";
import type { QueryResult } from "pg";
import type { DatabaseClient } from "../database-client";
import { waitlistEntriesTable } from "../schema";

type ReducedPricingSignupOptions = Parameters<
  WaitlistRepository["registerReducedPricingSignup"]
>[0];
type RegularPricingSignupOptions = Parameters<
  WaitlistRepository["registerRegularPricingSignup"]
>[0];

type ExistingSignupRow = {
  id: number;
};

type ReducedPricingCountRow = {
  entryCount: number;
};

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";
const UNIQUE_VIOLATION_CODE = "23505";
const WAITLIST_ENTRY_IDENTITY_CONSTRAINT =
  "waitlist_entries_email_offer_unique";

export class PostgresWaitlistRepository implements WaitlistRepository {
  constructor(private readonly database: DatabaseClient) {}

  async countReducedPricingSignupsCreatedBefore(options: {
    campaignSlug: string;
    createdBefore: Date;
  }): Promise<number> {
    const [result] = await this.database
      .select({ entryCount: count() })
      .from(waitlistEntriesTable)
      .where(
        and(
          eq(waitlistEntriesTable.campaignSlug, options.campaignSlug),
          eq(waitlistEntriesTable.pricingEligibility, "reduced"),
          lt(waitlistEntriesTable.createdAt, options.createdBefore),
        ),
      );

    return result?.entryCount ?? 0;
  }

  async registerRegularPricingSignup(
    options: RegularPricingSignupOptions,
  ): Promise<RegularPricingSignupResult> {
    return this.runRegistrationWithRetry(() =>
      this.registerRegularPricingSignupInSerializableTransaction(options),
    );
  }

  async registerReducedPricingSignup(
    options: ReducedPricingSignupOptions,
  ): Promise<ReducedPricingSignupResult> {
    return this.runRegistrationWithRetry(() =>
      this.registerReducedPricingSignupInSerializableTransaction(options),
    );
  }

  private async runRegistrationWithRetry<Result>(
    registration: () => Promise<Result>,
  ): Promise<Result> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await registration();
      } catch (error) {
        if (!isRetryableRegistrationError(error)) {
          throw error;
        }

        if (attempt === MAX_SERIALIZATION_RETRIES) {
          throw error;
        }
      }
    }

    throw new Error("Waitlist signup retry loop exited unexpectedly.");
  }

  private async registerRegularPricingSignupInSerializableTransaction(
    options: RegularPricingSignupOptions,
  ): Promise<RegularPricingSignupResult> {
    return this.database.transaction(
      async (transaction) => {
        const existingSignup = await transaction.execute<ExistingSignupRow>(sql`
          select id
          from app.waitlist_entries
          where email = ${options.normalizedEmail}
            and offer_slug = ${options.offer.campaignSlug}
          for update
        `);

        if (hasExistingSignup(existingSignup)) {
          await refreshConsentEvidence(transaction, options);

          return { status: "already_registered" };
        }

        await transaction.execute(sql`
          insert into app.waitlist_entries (
            email,
            offer_slug,
            offer_plan,
            pricing_eligibility,
            privacy_policy_version,
            marketing_consent_version,
            marketing_consented_at,
            updated_at
          )
          values (
            ${options.normalizedEmail},
            ${options.offer.campaignSlug},
            ${options.offer.plan},
            'regular',
            ${options.consentVersions.privacyPolicyVersion},
            ${options.consentVersions.marketingConsentVersion},
            now(),
            now()
          )
        `);

        return { status: "registered" };
      },
      { isolationLevel: "serializable" },
    );
  }

  private async registerReducedPricingSignupInSerializableTransaction(
    options: ReducedPricingSignupOptions,
  ): Promise<ReducedPricingSignupResult> {
    return this.database.transaction(
      async (transaction) => {
        const existingSignup = await transaction.execute<ExistingSignupRow>(sql`
          select id
          from app.waitlist_entries
          where email = ${options.normalizedEmail}
            and offer_slug = ${options.offer.campaignSlug}
          for update
        `);

        if (hasExistingSignup(existingSignup)) {
          await refreshConsentEvidence(transaction, options);

          return { status: "already_registered" };
        }

        const reducedPricingCountResult =
          await transaction.execute<ReducedPricingCountRow>(sql`
            select count(*)::int as "entryCount"
            from app.waitlist_entries
            where offer_slug = ${options.offer.campaignSlug}
              and pricing_eligibility = 'reduced'
          `);
        const reducedPricingCount = getReducedPricingCount(
          reducedPricingCountResult,
        );

        if (reducedPricingCount >= options.cap) {
          return { status: "capacity_reached" };
        }

        await transaction.execute(sql`
          insert into app.waitlist_entries (
            email,
            offer_slug,
            offer_plan,
            pricing_eligibility,
            privacy_policy_version,
            marketing_consent_version,
            marketing_consented_at,
            updated_at
          )
          values (
            ${options.normalizedEmail},
            ${options.offer.campaignSlug},
            ${options.offer.plan},
            'reduced',
            ${options.consentVersions.privacyPolicyVersion},
            ${options.consentVersions.marketingConsentVersion},
            now(),
            now()
          )
        `);

        return { status: "registered" };
      },
      { isolationLevel: "serializable" },
    );
  }
}

function hasExistingSignup(result: QueryResult<ExistingSignupRow>): boolean {
  return result.rows.length > 0;
}

function getReducedPricingCount(
  result: QueryResult<ReducedPricingCountRow>,
): number {
  const [row] = result.rows;

  if (!row) {
    throw new Error("Reduced pricing waitlist count query returned no rows.");
  }

  return row.entryCount;
}

async function refreshConsentEvidence(
  database: DatabaseClient,
  options: ReducedPricingSignupOptions | RegularPricingSignupOptions,
): Promise<void> {
  await database.execute(sql`
    update app.waitlist_entries
    set privacy_policy_version = ${options.consentVersions.privacyPolicyVersion},
      marketing_consent_version = ${options.consentVersions.marketingConsentVersion},
      marketing_consented_at = now(),
      updated_at = now()
    where email = ${options.normalizedEmail}
      and offer_slug = ${options.offer.campaignSlug}
  `);
}

function isRetryableRegistrationError(error: unknown): boolean {
  let currentError = error;

  while (typeof currentError === "object" && currentError !== null) {
    const code = getDatabaseErrorTextField(currentError, "code");

    if (code === SERIALIZATION_FAILURE_CODE) {
      return true;
    }

    if (
      code === UNIQUE_VIOLATION_CODE &&
      getDatabaseErrorTextField(currentError, "constraint") ===
        WAITLIST_ENTRY_IDENTITY_CONSTRAINT
    ) {
      return true;
    }

    currentError =
      "cause" in currentError
        ? (currentError as { cause?: unknown }).cause
        : null;
  }

  return false;
}

function getDatabaseErrorTextField(
  error: unknown,
  field: "code" | "constraint",
): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if (field in error) {
    const value = (error as Record<typeof field, unknown>)[field];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}
