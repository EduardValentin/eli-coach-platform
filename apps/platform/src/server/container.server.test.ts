import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { CLERK_TEST_ENVIRONMENT } from "@eli-coach-platform/config/test-support";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createPlatformContainer } from "./container.server";

const storeAssetRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-store-assets-container-unit-"),
);

function createRuntimeEnvironmentWithoutDatabase() {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    ...CLERK_TEST_ENVIRONMENT,
    ENVIRONMENT: "local",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    NODE_ENV: "development",
    STORE_ASSET_ROOT: storeAssetRoot,
    WAITLIST_MODE: "true",
  });
}

describe("platform container", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  it("is composed without database configuration", () => {
    // arrange
    const runtimeEnvironment = createRuntimeEnvironmentWithoutDatabase();

    // act
    const composeContainer = () =>
      createPlatformContainer({ runtimeEnvironment });

    // assert
    expect(composeContainer).not.toThrow();
  });

  it("answers bot detection configuration without a database", async () => {
    // arrange
    const container = createPlatformContainer({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const response = container.botDetectionController.getConfig();

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provider: "static",
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
  });

  it("answers the waitlist snapshot without a database", async () => {
    // arrange
    const container = createPlatformContainer({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const response = await container.waitlistController.getWaitlist();

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      availability: null,
      enabled: true,
    });
  });
});
