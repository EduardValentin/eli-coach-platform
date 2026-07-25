import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WaitlistMigrationTestContext } from "./support/waitlist-migration-test-context";

const migrationTestContext = new WaitlistMigrationTestContext();
const integrationHookTimeoutMs = 120_000;
const sentinelFeatureFlagDescription =
  "Sentinel description preserved by waitlist consent migration";

type ColumnMetadataRow = {
  column_name: string;
  data_type: string;
  is_nullable: "NO" | "YES";
  character_maximum_length: number | null;
  column_default: string | null;
};

type FeatureFlagRow = {
  name: string;
  enabled: boolean;
  description: string | null;
};

type RowCount = {
  count: string;
};

type IndexRow = {
  indexname: string;
};

describe.sequential("waitlist consent evidence migration", () => {
  beforeAll(async () => {
    await migrationTestContext.startAtLastPreConsentMigration();
  }, integrationHookTimeoutMs);

  afterAll(async () => {
    await migrationTestContext.stop();
  }, integrationHookTimeoutMs);

  it("removes legacy waitlist rows while preserving feature flags and adding strict consent evidence", async () => {
    // arrange
    await migrationTestContext.executeSql({
      sql: "insert into app.waitlist_entries (email) values ($1)",
      values: ["legacy@example.com"],
    });
    await migrationTestContext.executeSql({
      sql: "update app.feature_flags set description = $1 where name = $2",
      values: [sentinelFeatureFlagDescription, "WAITLIST_MODE"],
    });

    // act
    await migrationTestContext.applyCurrentApplicationMigrations();

    // assert
    const waitlistRows = await migrationTestContext.queryRows<RowCount>({
      sql: "select count(*) from app.waitlist_entries",
      values: [],
    });
    const featureFlags = await migrationTestContext.queryRows<FeatureFlagRow>({
      sql: `
        select name, enabled, description
        from app.feature_flags
        where name = $1
      `,
      values: ["WAITLIST_MODE"],
    });
    const columns = await migrationTestContext.queryRows<ColumnMetadataRow>({
      sql: `
        select
          column_name,
          data_type,
          is_nullable,
          character_maximum_length,
          column_default
        from information_schema.columns
        where table_schema = $1
          and table_name = $2
          and column_name = any($3::text[])
        order by column_name
      `,
      values: [
        "app",
        "waitlist_entries",
        [
          "marketing_consent_version",
          "marketing_consented_at",
          "privacy_policy_version",
          "updated_at",
        ],
      ],
    });
    const indexes = await migrationTestContext.queryRows<IndexRow>({
      sql: `
        select indexname
        from pg_indexes
        where schemaname = $1
          and tablename = $2
          and indexname = $3
      `,
      values: [
        "app",
        "waitlist_entries",
        "waitlist_entries_updated_at_idx",
      ],
    });

    expect(waitlistRows).toEqual([{ count: "0" }]);
    expect(featureFlags).toEqual([
      {
        name: "WAITLIST_MODE",
        enabled: true,
        description: sentinelFeatureFlagDescription,
      },
    ]);
    expect(columns).toEqual([
      {
        column_name: "marketing_consent_version",
        data_type: "character varying",
        is_nullable: "NO",
        character_maximum_length: 64,
        column_default: null,
      },
      {
        column_name: "marketing_consented_at",
        data_type: "timestamp with time zone",
        is_nullable: "NO",
        character_maximum_length: null,
        column_default: null,
      },
      {
        column_name: "privacy_policy_version",
        data_type: "character varying",
        is_nullable: "NO",
        character_maximum_length: 64,
        column_default: null,
      },
      {
        column_name: "updated_at",
        data_type: "timestamp with time zone",
        is_nullable: "NO",
        character_maximum_length: null,
        column_default: null,
      },
    ]);
    expect(indexes).toEqual([
      {
        indexname: "waitlist_entries_updated_at_idx",
      },
    ]);
  });
});
