import {
  Waitlist,
  type WaitlistEntries,
  type WaitlistOffer,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
} from "@eli-coach-platform/domain/waitlist";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { and, count, eq, lt, sql } from "drizzle-orm";
import type { QueryResult } from "pg";
import { waitlistEntriesTable } from "./schema.server";

type ReducedPricingSignupOptions = Parameters<
  WaitlistEntries["registerReducedPricingSignup"]
>[0];
type RegularPricingSignupOptions = Parameters<
  WaitlistEntries["registerRegularPricingSignup"]
>[0];

type ExistingSignupRow = {
  id: number;
};

type ReducedPricingCountRow = {
  entryCount: number;
};

export class PostgresWaitlistRepository implements WaitlistEntries {
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
    return this.database.transaction(async (transaction) => {
      await lockOfferSignups(transaction, options.offer);

      const existingSignup = await transaction.execute<ExistingSignupRow>(sql`
        select id
        from app.waitlist_entries
        where email = ${options.normalizedEmail}
          and offer_slug = ${options.offer.campaignSlug}
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
    });
  }

  async registerReducedPricingSignup(
    options: ReducedPricingSignupOptions,
  ): Promise<ReducedPricingSignupResult> {
    return this.database.transaction(async (transaction) => {
      await lockOfferSignups(transaction, options.offer);

      const existingSignup = await transaction.execute<ExistingSignupRow>(sql`
        select id
        from app.waitlist_entries
        where email = ${options.normalizedEmail}
          and offer_slug = ${options.offer.campaignSlug}
      `);

      const alreadyRegistered = hasExistingSignup(existingSignup);
      const reducedPricingCount = alreadyRegistered
        ? 0
        : getReducedPricingCount(
            await transaction.execute<ReducedPricingCountRow>(sql`
              select count(*)::int as "entryCount"
              from app.waitlist_entries
              where offer_slug = ${options.offer.campaignSlug}
                and pricing_eligibility = 'reduced'
            `),
          );

      const decision = Waitlist.decideReducedPricingRegistration({
        alreadyRegistered,
        cap: options.cap,
        reducedPricingCount,
      });

      switch (decision) {
        case "already_registered": {
          await refreshConsentEvidence(transaction, options);

          return { status: "already_registered" };
        }

        case "capacity_reached": {
          return { status: "capacity_reached" };
        }

        case "register": {
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
        }
      }
    });
  }
}

async function lockOfferSignups(
  transaction: DatabaseClient,
  offer: WaitlistOffer,
): Promise<void> {
  await transaction.execute(sql`
    select pg_advisory_xact_lock(
      hashtextextended(${`waitlist_entries:${offer.campaignSlug}`}, 0)
    )
  `);
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
