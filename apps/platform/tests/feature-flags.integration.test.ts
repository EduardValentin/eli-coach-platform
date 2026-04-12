import { featureFlagSnapshotSchema } from "@eli-coach-platform/contracts";
import type { PlatformContainer } from "../app/server/container.server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { handleFeatureFlagsRequest } from "../app/modules/feature-flags/feature-flag-api.server";
import { getSharedPlatformIntegrationTestContext } from "./support/platform-integration-test-context";

const integrationTestContext = getSharedPlatformIntegrationTestContext();

function createFeatureFlagsRequest(body?: unknown): Request {
  return new Request("http://localhost/api/feature-flags", {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
    method: "POST",
  });
}

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
    await integrationTestContext.applySharedSeeds();
    await integrationTestContext.createSnapshot();
  }, 120000);

  beforeEach(() => {
    platformContainer = integrationTestContext.createPlatformContainer();
  });

  afterEach(async () => {
    if (platformContainer) {
      await platformContainer.databasePool.end();
      platformContainer = null;
    }

    await integrationTestContext.restoreSnapshot();
  });

  afterAll(async () => {
    await integrationTestContext.stop();
  });

  it("returns the seeded feature flag snapshot and preserves the stored database row", async () => {
    const response = await handleFeatureFlagsRequest(
      createFeatureFlagsRequest({
        context: {
          userId: "user-123",
        },
      }),
      requirePlatformContainer(platformContainer),
    );
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

  it("returns false for supported flags that are missing in storage", async () => {
    await integrationTestContext.executeSql({
      sql: "delete from app.feature_flags where name = $1",
      values: ["WAITLIST_MODE"],
    });

    const response = await handleFeatureFlagsRequest(
      createFeatureFlagsRequest(),
      requirePlatformContainer(platformContainer),
    );
    const body = featureFlagSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      flags: {
        WAITLIST_MODE: false,
      },
    });
  });

  it("keeps seed data idempotent when the seed process runs again", async () => {
    await integrationTestContext.applySharedSeeds();

    const rowCount = await integrationTestContext.countRows({
      tableName: "app.feature_flags",
      values: ["WAITLIST_MODE"],
      whereClause: "name = $1",
    });

    expect(rowCount).toBe(1);
  });
});
