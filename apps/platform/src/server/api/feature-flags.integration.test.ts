import { featureFlagSnapshotSchema } from "@eli-coach-platform/infrastructure/feature-flags/server";
import type { PlatformContainer } from "~/server/container.server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PlatformIntegrationTestContext } from "~tests/support/platform-integration-test-context";

const integrationTestContext = new PlatformIntegrationTestContext();
const integrationHookTimeoutMs = 120_000;

function requirePlatformContainer(platformContainer: PlatformContainer | null): PlatformContainer {
  if (!platformContainer) {
    throw new Error("Platform container has not been created.");
  }

  return platformContainer;
}

describe.sequential("feature flag API integration", () => {
  let platformContainer: PlatformContainer | null = null;

  beforeAll(async () => {
    await integrationTestContext.start();
    await integrationTestContext.resetToBaselineState();
    platformContainer = integrationTestContext.getPlatformContainer();
  }, integrationHookTimeoutMs);

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
  }, integrationHookTimeoutMs);

  afterAll(async () => {
    await integrationTestContext.stop();
  }, integrationHookTimeoutMs);

  it("returns a persisted feature flag snapshot and preserves the stored database row", async () => {
    // arrange
    const controller = requirePlatformContainer(platformContainer).featureFlagController;
    await integrationTestContext.executeSql({
      sql: `
        insert into app.feature_flags (name, enabled, description)
        values ($1, true, $2)
      `,
      values: ["CLIENT_PORTAL", "Controls access to the client portal."],
    });

    // act
    const response = await controller.getSnapshot();

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.feature_flags",
      values: ["CLIENT_PORTAL"],
      whereClause: "name = $1",
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        CLIENT_PORTAL: true,
      },
    });
    expect(rowCount).toBe(1);
  });

  it("returns only persisted feature flags", async () => {
    // arrange
    const controller = requirePlatformContainer(platformContainer).featureFlagController;

    // act
    const response = await controller.getSnapshot();

    // assert
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {},
    });
  });

  it("removes transient feature flags when resetting the test database", async () => {
    // arrange
    await integrationTestContext.executeSql({
      sql: `
        insert into app.feature_flags (name, enabled, description)
        values ($1, true, $2)
      `,
      values: ["CLIENT_PORTAL", "Controls access to the client portal."],
    });

    // act
    await integrationTestContext.resetToBaselineState();

    // assert
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.feature_flags",
      values: ["CLIENT_PORTAL"],
      whereClause: "name = $1",
    });

    expect(rowCount).toBe(0);
  });
});
