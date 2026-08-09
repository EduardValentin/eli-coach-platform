import {
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";

import type { BotDetectionConfig } from "./bot-detection-contract";

export function createBotDetectionConfig(
  runtimeEnvironment: RuntimeEnvironment,
): BotDetectionConfig {
  if (usesStaticBotDetection(runtimeEnvironment)) {
    return {
      provider: "static",
      token: runtimeEnvironment.TURNSTILE_STATIC_TOKEN,
    };
  }

  return {
    provider: "turnstile",
    siteKey: runtimeEnvironment.TURNSTILE_SITE_KEY,
  };
}

export function usesStaticBotDetection(runtimeEnvironment: RuntimeEnvironment): boolean {
  if (runtimeEnvironment.NODE_ENV === "test") {
    return true;
  }

  return (
    runtimeEnvironment.ENVIRONMENT === "local" &&
    runtimeEnvironment.TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY &&
    runtimeEnvironment.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET_KEY
  );
}
