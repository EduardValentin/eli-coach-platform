import { WAITLIST_REDUCED_PRICING_CAP } from "@eli-coach-platform/domain/waitlist";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MigrationTestDatabase } from "~integration-test-config/migration-test-database";

const lastMigrationBeforeReducedSlots =
  "0018_restore_waitlist_mode_feature_flag";

type LegacyEntry = {
  campaignSlug: string;
  createdAt: string;
  email: string;
  pricing: "reduced" | "regular";
};

type NumberedEntry = {
  email: string;
  reducedSlot: number | null;
};

describe.sequential("reduced slot migration", () => {
  let database: MigrationTestDatabase;

  beforeEach(async () => {
    database = new MigrationTestDatabase();
    await database.startMigratedThrough(lastMigrationBeforeReducedSlots);
  });

  afterEach(async () => {
    await database.stop();
  });

  it("numbers existing reduced price entries per offer in signup order", async () => {
    // arrange
    await insertLegacyEntries([
      {
        campaignSlug: "all-bundles-launch-1",
        createdAt: "2026-03-01T00:00:00.000Z",
        email: "latest@example.com",
        pricing: "reduced",
      },
      {
        campaignSlug: "all-bundles-launch-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "earliest-first-inserted@example.com",
        pricing: "reduced",
      },
      {
        campaignSlug: "all-bundles-launch-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "earliest-second-inserted@example.com",
        pricing: "reduced",
      },
      {
        campaignSlug: "all-bundles-launch-1",
        createdAt: "2026-02-01T00:00:00.000Z",
        email: "regular@example.com",
        pricing: "regular",
      },
      {
        campaignSlug: "all-bundles-launch-2",
        createdAt: "2026-04-01T00:00:00.000Z",
        email: "other-offer@example.com",
        pricing: "reduced",
      },
    ]);

    // act
    await database.applyRemainingMigrations();

    // assert
    const entries = await database.queryRows<NumberedEntry>({
      sql: `
        select email, reduced_slot as "reducedSlot"
        from app.waitlist_entries
        order by offer_slug, reduced_slot nulls last
      `,
      values: [],
    });

    expect(entries).toEqual([
      { email: "earliest-first-inserted@example.com", reducedSlot: 1 },
      { email: "earliest-second-inserted@example.com", reducedSlot: 2 },
      { email: "latest@example.com", reducedSlot: 3 },
      { email: "regular@example.com", reducedSlot: null },
      { email: "other-offer@example.com", reducedSlot: 1 },
    ]);
  });

  it("applies when exactly as many reduced price entries exist as the reduced pricing cap", async () => {
    // arrange
    await insertLegacyEntries(
      reducedPriceEntries(WAITLIST_REDUCED_PRICING_CAP),
    );

    // act
    await database.applyRemainingMigrations();

    // assert
    const slots = await database.queryRows<{ reducedSlot: number }>({
      sql: `
        select reduced_slot as "reducedSlot"
        from app.waitlist_entries
        order by reduced_slot
      `,
      values: [],
    });

    expect(slots.map((slot) => slot.reducedSlot)).toEqual(
      Array.from(
        { length: WAITLIST_REDUCED_PRICING_CAP },
        (_, index) => index + 1,
      ),
    );
  });

  it("fails when more reduced price entries exist than the reduced pricing cap", async () => {
    // arrange
    await insertLegacyEntries(
      reducedPriceEntries(WAITLIST_REDUCED_PRICING_CAP + 1),
    );

    // act
    const migration = database.applyRemainingMigrations();

    // assert
    await expect(migration).rejects.toThrow();
    const reducedSlotColumns = await database.queryRows<{ name: string }>({
      sql: `
        select column_name as name
        from information_schema.columns
        where table_schema = 'app'
          and table_name = 'waitlist_entries'
          and column_name = 'reduced_slot'
      `,
      values: [],
    });

    expect(reducedSlotColumns).toEqual([]);
  });

  function reducedPriceEntries(entryCount: number): LegacyEntry[] {
    return Array.from({ length: entryCount }, (_, index) => ({
      campaignSlug: "all-bundles-launch-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      email: `person-${index}@example.com`,
      pricing: "reduced",
    }));
  }

  async function insertLegacyEntries(
    entries: readonly LegacyEntry[],
  ): Promise<void> {
    for (const entry of entries) {
      await database.executeSql({
        sql: `
          insert into app.waitlist_entries (
            email,
            offer_slug,
            offer_plan,
            pricing_eligibility,
            privacy_policy_version,
            marketing_consent_version,
            marketing_consented_at,
            created_at,
            updated_at
          )
          values ($1, $2, 'all-bundles', $3, 'privacy-v1', 'marketing-v1', $4, $4, $4)
        `,
        values: [
          entry.email,
          entry.campaignSlug,
          entry.pricing,
          entry.createdAt,
        ],
      });
    }
  }
});
