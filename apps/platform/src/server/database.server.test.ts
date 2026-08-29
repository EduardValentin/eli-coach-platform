import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it, vi } from "vitest";

import { createPlatformDatabase, DatabaseClosedError } from "./database.server";

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

  it("throws a named error rather than reopening after close", async () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });
    await database.close();

    // act
    const useAfterClose = () => database.client.select();

    // assert
    expect(useAfterClose).toThrow(DatabaseClosedError);
    expect(useAfterClose).toThrow("database client used after close");
  });

  it("does not open a pool to answer a thenable check", () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const thenValue = (database.client as unknown as { then?: unknown }).then;

    // assert
    expect(thenValue).toBeUndefined();
  });

  it("does not open a pool to answer a symbol property", () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });

    // act
    const symbolValue = (database.client as unknown as Record<symbol, unknown>)[
      Symbol.toPrimitive
    ];

    // assert
    expect(symbolValue).toBeUndefined();
  });

  it("logs the missing database configuration once even after repeated use", () => {
    // arrange
    const database = createPlatformDatabase({
      runtimeEnvironment: createRuntimeEnvironmentWithoutDatabase(),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // act
    expect(() => database.client.select()).toThrow();
    expect(() => database.client.select()).toThrow();

    // assert
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
