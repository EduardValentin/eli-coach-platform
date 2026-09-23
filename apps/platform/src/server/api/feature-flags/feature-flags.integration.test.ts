import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { requireSessionCookie } from "~integration-test-config/session-cookie";
import { featureFlagSnapshotSchema } from "~/server/api/feature-flags/feature-flags-contract";

const suite = new ApiIntegrationTestSuite();

describe.sequential("feature flag API integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("returns a persisted feature flag snapshot and preserves the stored database row", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: `
        insert into app.feature_flags (name, enabled, description)
        values ($1, true, $2)
      `,
      values: ["CLIENT_PORTAL", "Controls access to the client portal."],
    });

    // act
    const response = await requestFeatureFlags();

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());
    const rowCount = await suite.postgres.countRows({
      tableName: "app.feature_flags",
      values: ["CLIENT_PORTAL"],
      whereClause: "name = $1",
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        CLIENT_PORTAL: true,
        WAITLIST_MODE: true,
      },
    });
    expect(rowCount).toBe(1);
  });

  it("returns every persisted feature flag", async () => {
    // arrange, act
    const response = await requestFeatureFlags();

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({ flags: { WAITLIST_MODE: true } });
  });

  it("overrides a flag for one browser without changing the stored row", async () => {
    // arrange, act
    const response = await requestFeatureFlags({
      search: "?ff.WAITLIST_MODE=false",
    });

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());
    const [storedFlag] = await suite.postgres.queryRows<{ enabled: boolean }>({
      sql: "select enabled from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({ flags: { WAITLIST_MODE: false } });
    expect(storedFlag).toEqual({ enabled: true });
  });

  it("keeps an override for later requests in the browser session", async () => {
    // arrange
    const overrideResponse = await requestFeatureFlags({
      search: "?ff.WAITLIST_MODE=false",
    });

    // act
    const response = await requestFeatureFlags({
      cookie: requireSessionCookie(overrideResponse),
    });

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({ flags: { WAITLIST_MODE: false } });
  });
});

async function requestFeatureFlags(
  options: { search?: string; cookie?: string } = {},
): Promise<Response> {
  return suite.request(
    new Request(suite.url(`/api/feature-flags${options.search ?? ""}`), {
      headers: options.cookie ? { Cookie: options.cookie } : undefined,
    }),
  );
}
