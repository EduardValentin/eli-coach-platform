import { CLERK_TEST_ENVIRONMENT } from "@eli-coach-platform/test-support";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RouterContextProvider } from "react-router";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const storeAssetRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-feature-flag-overrides-"),
);

describe("feature flag override composition", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not parse override input outside local and test", async () => {
    // arrange
    const { featureFlagOverrideMiddleware } =
      await loadCompositionFor("preview");
    const applicationResponse = new Response("ok");
    const next = vi.fn().mockResolvedValue(applicationResponse);

    // act
    const response = await featureFlagOverrideMiddleware(
      {
        context: new RouterContextProvider(),
        params: {},
        request: new Request("https://eli.example/?ff.UNKNOWN=true"),
      } as never,
      next,
    );

    // assert
    expect(response).toBe(applicationResponse);
    expect(applicationResponse.headers.get("Set-Cookie")).toBeNull();
    expect(applicationResponse.headers.get("Cache-Control")).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });

  it.each(["local", "test"])(
    "applies override input in %s",
    async (environment) => {
      // arrange
      const { featureFlagOverrideMiddleware } =
        await loadCompositionFor(environment);
      const applicationResponse = new Response("ok");
      const next = vi.fn().mockResolvedValue(applicationResponse);

      // act
      await featureFlagOverrideMiddleware(
        {
          context: new RouterContextProvider(),
          params: {},
          request: new Request("https://eli.example/?ff.WAITLIST_MODE=false"),
        } as never,
        next,
      );

      // assert
      expect(applicationResponse.headers.get("Set-Cookie")).toContain(
        "__eli_feature_flags=%7B%22WAITLIST_MODE%22%3Afalse%7D",
      );
      expect(applicationResponse.headers.get("Cache-Control")).toBe(
        "private, no-store",
      );
    },
  );
});

async function loadCompositionFor(environment: string) {
  vi.stubEnv("APP_NAME", "eli-coach-platform");
  vi.stubEnv(
    "CLERK_PUBLISHABLE_KEY",
    CLERK_TEST_ENVIRONMENT.CLERK_PUBLISHABLE_KEY,
  );
  vi.stubEnv("CLERK_SECRET_KEY", CLERK_TEST_ENVIRONMENT.CLERK_SECRET_KEY);
  vi.stubEnv("CLERK_SIGN_IN_URL", CLERK_TEST_ENVIRONMENT.CLERK_SIGN_IN_URL);
  vi.stubEnv("ENVIRONMENT", environment);
  vi.stubEnv("MANAGEMENT_API_SECRET", "unit-test-management-api-secret-value");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("PUBLIC_APP_URL", "https://eli.example");
  vi.stubEnv("STORE_ASSET_ROOT", storeAssetRoot);
  vi.resetModules();

  return import("~/server/non-production/feature-flag-overrides-composition.server");
}
