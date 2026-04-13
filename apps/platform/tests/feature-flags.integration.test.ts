import { featureFlagSnapshotSchema } from "@eli-coach-platform/contracts";
import type { PlatformContainer } from "../app/server/container.server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PlatformIntegrationTestContext } from "./support/platform-integration-test-context";

const integrationTestContext = new PlatformIntegrationTestContext();

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
  }, 120000);

  afterEach(async () => {
    await integrationTestContext.resetToBaselineState();
  });

  afterAll(async () => {
    await integrationTestContext.stop();
  });

  it("returns the seeded feature flag snapshot and preserves the stored database row", async () => {
    const response = await requirePlatformContainer(platformContainer).featureFlagController.getSnapshot();
    const body = featureFlagSnapshotSchema.parse(await response.json());
    const rowCount = await integrationTestContext.countRows({
      tableName: "app.feature_flags",
      values: ["WAITLIST_MODE"],
      whereClause: "name = $1",
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        WAITLIST_MODE: true,
      },
    });
    expect(rowCount).toBe(1);
  });

  it("returns only persisted feature flags", async () => {
    await integrationTestContext.executeSql({
      sql: "delete from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });

    const response = await requirePlatformContainer(platformContainer).featureFlagController.getSnapshot();
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {},
    });
  });

  it("restores the baseline flag data after resetting the test database", async () => {
    await integrationTestContext.executeSql({
      sql: "delete from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });
    await integrationTestContext.resetToBaselineState();

    const rowCount = await integrationTestContext.countRows({
      tableName: "app.feature_flags",
      values: ["WAITLIST_MODE"],
      whereClause: "name = $1",
    });

    expect(rowCount).toBe(1);
  });
});
