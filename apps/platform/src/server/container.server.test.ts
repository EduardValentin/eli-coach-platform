import { loadRuntimeEnvironment } from "@eli-coach-platform/config/runtime";
import { CLERK_TEST_ENVIRONMENT } from "@eli-coach-platform/test-support";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

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
    PUBLIC_APP_URL: "https://eli.example",
    STORE_ASSET_ROOT: storeAssetRoot,
  });
}

describe("platform container", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("answers bot detection configuration without a database", () => {
    // arrange
    const container = createPlatformContainer({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const botDetectionConfig = container.platform.botDetection;

    // assert
    expect(botDetectionConfig).toEqual({
      provider: "static",
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
  });

  it("creates the request-scoped container once", async () => {
    // arrange
    vi.stubEnv("APP_NAME", "eli-coach-platform");
    vi.stubEnv(
      "CLERK_PUBLISHABLE_KEY",
      CLERK_TEST_ENVIRONMENT.CLERK_PUBLISHABLE_KEY,
    );
    vi.stubEnv("CLERK_SECRET_KEY", CLERK_TEST_ENVIRONMENT.CLERK_SECRET_KEY);
    vi.stubEnv("CLERK_SIGN_IN_URL", CLERK_TEST_ENVIRONMENT.CLERK_SIGN_IN_URL);
    vi.stubEnv("ENVIRONMENT", "local");
    vi.stubEnv(
      "MANAGEMENT_API_SECRET",
      "unit-test-management-api-secret-value",
    );
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUBLIC_APP_URL", "https://eli.example");
    vi.stubEnv("STORE_ASSET_ROOT", storeAssetRoot);
    vi.resetModules();
    const { getPlatformContainer } = await import("./container.server");

    // act
    const container = getPlatformContainer();
    const sameContainer = getPlatformContainer();

    // assert
    expect(sameContainer).toBe(container);
  });

  it("answers the waitlist snapshot without a database", async () => {
    // arrange
    const container = createPlatformContainer({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const waitlist = await container.waitlist.waitlist.getWaitlist();

    // assert
    expect(waitlist).toMatchObject({
      availability: null,
      enabled: true,
    });
  });
});
