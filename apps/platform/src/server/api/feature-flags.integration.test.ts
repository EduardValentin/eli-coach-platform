import { featureFlagSnapshotSchema } from "@eli-coach-platform/infrastructure/feature-flags/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

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
    expect(body).toEqual({ flags: { CLIENT_PORTAL: true } });
    expect(rowCount).toBe(1);
  });

  it("returns only persisted feature flags", async () => {
    // arrange, act
    const response = await requestFeatureFlags();

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({ flags: {} });
  });
});

async function requestFeatureFlags(): Promise<Response> {
  return suite.request(new Request(suite.url("/api/feature-flags")));
}
