import { loadRuntimeEnvironment } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { createBotDetectionConfig, usesStaticBotDetection } from "./bot-detection-config.server";

function createRuntimeEnvironment(overrides?: NodeJS.ProcessEnv) {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
    CLERK_SECRET_KEY: "sk_test_1234567890abcdefghijklmnopqrstuvwxyz",
    CLERK_SIGN_IN_URL: "https://evoa.fit/sign-in",
    DATABASE_HOST: "127.0.0.1",
    DATABASE_NAME: "eli_coach_platform",
    DATABASE_PASSWORD: "app-password",
    DATABASE_PORT: "55437",
    DATABASE_USER: "app-user",
    ENVIRONMENT: "local",
    NODE_ENV: "development",
    PORT: "3000",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    STORE_ASSET_ROOT: "/tmp/eli-coach-store-assets-test",
    ...overrides,
  });
}

describe("bot detection configuration", () => {
  it("uses a static challenge for local development with Cloudflare test keys", () => {
    // arrange
    const runtimeEnvironment = createRuntimeEnvironment();

    // act
    const usesStaticChallenge = usesStaticBotDetection(runtimeEnvironment);
    const botDetectionConfig = createBotDetectionConfig(runtimeEnvironment);

    // assert
    expect(usesStaticChallenge).toBe(true);
    expect(botDetectionConfig).toEqual({
      provider: "static",
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
  });

  it("uses Turnstile outside local development even with Cloudflare test keys", () => {
    // arrange
    const runtimeEnvironment = createRuntimeEnvironment({
      ENVIRONMENT: "test",
      NODE_ENV: "test",
    });

    // act
    const usesStaticChallenge = usesStaticBotDetection(runtimeEnvironment);

    // assert
    expect(usesStaticChallenge).toBe(false);
  });

  it("uses Turnstile when runtime keys are explicitly configured", () => {
    // arrange
    const runtimeEnvironment = createRuntimeEnvironment({
      ENVIRONMENT: "test",
      NODE_ENV: "production",
      TURNSTILE_SECRET_KEY: "real-secret-key",
      TURNSTILE_SITE_KEY: "real-site-key",
    });

    // act
    const usesStaticChallenge = usesStaticBotDetection(runtimeEnvironment);
    const botDetectionConfig = createBotDetectionConfig(runtimeEnvironment);

    // assert
    expect(usesStaticChallenge).toBe(false);
    expect(botDetectionConfig).toEqual({
      provider: "turnstile",
      siteKey: "real-site-key",
    });
  });
});
