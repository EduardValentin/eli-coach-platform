import {
  WAITLIST_REDUCED_PRICING_CAP,
  type WaitlistEntries,
  type WaitlistOffer,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
} from "@eli-coach-platform/domain/waitlist";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { and, count, eq, lt, sql } from "drizzle-orm";
import { waitlistEntriesTable } from "./schema.server";
import {
  rejectsDuplicateSignup,
  rejectsReducedSlot,
} from "./signup-constraint-violations.server";

type ReducedPricingSignupOptions = Parameters<
  WaitlistEntries["registerReducedPricingSignup"]
>[0];
type RegularPricingSignupOptions = Parameters<
  WaitlistEntries["registerRegularPricingSignup"]
>[0];
type SignupOptions = ReducedPricingSignupOptions | RegularPricingSignupOptions;

type EntryPlacement =
  | { pricing: "reduced"; reducedSlot: number }
  | { pricing: "regular"; reducedSlot: null };

type ExistingSignupRow = {
  id: number;
};

type FreeReducedSlotRow = {
  reducedSlot: number;
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
    return this.database.transaction(
      async (transaction) => {
        await lockOfferSignups(transaction, options.offer);

        if (await isAlreadyRegistered(transaction, options)) {
          return refreshConsentEvidence(transaction, options);
        }

        try {
          await insertEntry(transaction, options, {
            pricing: "regular",
            reducedSlot: null,
          });

          return { status: "registered" };
        } catch (error) {
          if (rejectsDuplicateSignup(error)) {
            return refreshConsentEvidence(transaction, options);
          }

          throw error;
        }
      },
      { isolationLevel: "read committed" },
    );
  }

  async registerReducedPricingSignup(
    options: ReducedPricingSignupOptions,
  ): Promise<ReducedPricingSignupResult> {
    return this.database.transaction(
      async (transaction) => {
        await lockOfferSignups(transaction, options.offer);

        if (await isAlreadyRegistered(transaction, options)) {
          return refreshConsentEvidence(transaction, options);
        }

        const reducedSlot = await findLowestFreeReducedSlot(
          transaction,
          options,
        );

        if (reducedSlot === null) {
          return { status: "capacity_reached" };
        }

        try {
          await insertEntry(transaction, options, {
            pricing: "reduced",
            reducedSlot,
          });

          return { status: "registered" };
        } catch (error) {
          if (rejectsReducedSlot(error)) {
            return { status: "capacity_reached" };
          }

          if (rejectsDuplicateSignup(error)) {
            return refreshConsentEvidence(transaction, options);
          }

          throw error;
        }
      },
      { isolationLevel: "read committed" },
    );
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

async function isAlreadyRegistered(
  transaction: DatabaseClient,
  options: SignupOptions,
): Promise<boolean> {
  const existingSignup = await transaction.execute<ExistingSignupRow>(sql`
    select id
    from app.waitlist_entries
    where email = ${options.normalizedEmail}
      and offer_slug = ${options.offer.campaignSlug}
  `);

  return existingSignup.rows.length > 0;
}

async function findLowestFreeReducedSlot(
  transaction: DatabaseClient,
  options: ReducedPricingSignupOptions,
): Promise<number | null> {
  const freeSlot = await transaction.execute<FreeReducedSlotRow>(sql`
    select slot as "reducedSlot"
    from generate_series(1, ${WAITLIST_REDUCED_PRICING_CAP}::int) as slot
    where not exists (
      select 1
      from app.waitlist_entries
      where offer_slug = ${options.offer.campaignSlug}
        and reduced_slot = slot
    )
    order by slot
    limit 1
  `);

  return freeSlot.rows[0]?.reducedSlot ?? null;
}

async function insertEntry(
  transaction: DatabaseClient,
  options: SignupOptions,
  placement: EntryPlacement,
): Promise<void> {
  await transaction.transaction(async (savepoint) => {
    await savepoint.execute(sql`
      insert into app.waitlist_entries (
        email,
        offer_slug,
        offer_plan,
        pricing_eligibility,
        reduced_slot,
        privacy_policy_version,
        marketing_consent_version,
        marketing_consented_at,
        updated_at
      )
      values (
        ${options.normalizedEmail},
        ${options.offer.campaignSlug},
        ${options.offer.plan},
        ${placement.pricing},
        ${placement.reducedSlot},
        ${options.consentVersions.privacyPolicyVersion},
        ${options.consentVersions.marketingConsentVersion},
        now(),
        now()
      )
    `);
  });
}

async function refreshConsentEvidence(
  transaction: DatabaseClient,
  options: SignupOptions,
): Promise<{ status: "already_registered" }> {
  await transaction.execute(sql`
    update app.waitlist_entries
    set privacy_policy_version = ${options.consentVersions.privacyPolicyVersion},
      marketing_consent_version = ${options.consentVersions.marketingConsentVersion},
      marketing_consented_at = now(),
      updated_at = now()
    where email = ${options.normalizedEmail}
      and offer_slug = ${options.offer.campaignSlug}
  `);

  return { status: "already_registered" };
}
