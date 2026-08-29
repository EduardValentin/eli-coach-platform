import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { createPlatformDatabase } from "./database.server";

function createRuntimeEnvironmentWithoutDatabase() {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
    CLERK_SECRET_KEY: "sk_test_1234567890abcdefghijklmnopqrstuvwxyz",
    CLERK_SIGN_IN_URL: "https://evoa.fit/sign-in",
    ENVIRONMENT: "local",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    NODE_ENV: "development",
    STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
  });
}

describe("platform database", () => {
  it("is created without database configuration", () => {
    // arrange
    const runtimeEnvironment = createRuntimeEnvironmentWithoutDatabase();

    // act
    const createDatabase = () => createPlatformDatabase({ runtimeEnvironment });

    // assert
    expect(createDatabase).not.toThrow();
  });

  it("names the missing database configuration on first use", () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const useDatabase = () => database.client.select();

    // assert
    expect(useDatabase).toThrow(/DATABASE_HOST/);
  });

  it("closes without ever opening a connection", async () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const close = database.close();

    // assert
    await expect(close).resolves.toBeUndefined();
  });
});
