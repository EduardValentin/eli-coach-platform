import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
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
    CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
    CLERK_SECRET_KEY: "sk_test_1234567890abcdefghijklmnopqrstuvwxyz",
    CLERK_SIGN_IN_URL: "https://evoa.fit/sign-in",
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
