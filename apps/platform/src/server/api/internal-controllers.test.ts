import { appMetadataSchema } from "./service-metadata";
import { loadRuntimeEnvironment, type RuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { AppMetadataController } from "./app-metadata-controller.server";
import { ReadyzController } from "./readyz-controller.server";

function createRuntimeEnvironment(
  overrides: Partial<Record<string, string>> = {},
): RuntimeEnvironment {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
    CLERK_SECRET_KEY: "sk_test_1234567890abcdefghijklmnopqrstuvwxyz",
    CLERK_SIGN_IN_URL: "https://evoa.fit/sign-in",
    ENVIRONMENT: "local",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    NODE_ENV: "development",
    STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
    ...overrides,
  });
}

describe("internal controllers", () => {
  it("returns application metadata from the controller", async () => {
    // arrange
    const controller = new AppMetadataController({
      appName: "eli-coach-platform",
      environment: "test",
      version: "sha-123",
    });

    // act
    const response = controller.getMetadata();

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      appMetadataSchema.parse({
        appName: "eli-coach-platform",
        environment: "test",
        version: "sha-123",
      }),
    );
  });

  describe("ReadyzController", () => {
    it("reports healthy when ENVIRONMENT is local, even without database configuration", async () => {
      // arrange
      const controller = new ReadyzController(createRuntimeEnvironment({ ENVIRONMENT: "local" }));

      // act
      const response = controller.getStatus();

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      await expect(response.text()).resolves.toBe("ok");
    });

    it("reports unhealthy when non-local and database configuration is incomplete", async () => {
      // arrange
      const controller = new ReadyzController(createRuntimeEnvironment({ ENVIRONMENT: "test" }));

      // act
      const response = controller.getStatus();

      // assert
      expect(response.status).toBe(503);
      const body = await response.text();
      expect(body).not.toBe("ok");
      // No secrets in the reason string — just a terse, non-identifying reason.
      expect(body.toLowerCase()).not.toContain("password");
    });

    it("reports healthy when non-local and database configuration is complete", async () => {
      // arrange
      const controller = new ReadyzController(
        createRuntimeEnvironment({
          ENVIRONMENT: "test",
          DATABASE_HOST: "localhost",
          DATABASE_NAME: "app",
          DATABASE_PASSWORD: "unit-test-password",
          DATABASE_PORT: "5432",
          DATABASE_USER: "app",
        }),
      );

      // act
      const response = controller.getStatus();

      // assert
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("ok");
    });
  });
});
