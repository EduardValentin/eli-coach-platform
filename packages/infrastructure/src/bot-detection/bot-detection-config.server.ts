import {
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  type RuntimeEnvironment,
} from "@eli-coach-platform/config";

import {
  botDetectionConfigSchema,
  type BotDetectionConfig,
} from "./bot-detection-contract";

// Rejects a blank token or site key from the environment before it reaches the browser.
export function createBotDetectionConfig(
  runtimeEnvironment: RuntimeEnvironment,
): BotDetectionConfig {
  if (usesStaticBotDetection(runtimeEnvironment)) {
    return botDetectionConfigSchema.parse({
      provider: "static",
      token: runtimeEnvironment.TURNSTILE_STATIC_TOKEN,
    });
  }

  return botDetectionConfigSchema.parse({
    provider: "turnstile",
    siteKey: runtimeEnvironment.TURNSTILE_SITE_KEY,
  });
}

/**
 * Local development against Cloudflare's published test keys has no challenge
 * to solve, so the static token stands in for one.
 */
export function usesStaticBotDetection(runtimeEnvironment: RuntimeEnvironment): boolean {
  return (
    runtimeEnvironment.ENVIRONMENT === "local" &&
    runtimeEnvironment.TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY &&
    runtimeEnvironment.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET_KEY
  );
}
