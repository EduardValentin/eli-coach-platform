import type { BotDetectionSettings } from "~/shared/submission-checks/bot-detection-config";

import {
  botDetectionConfigSchema,
  type BotDetectionConfig,
} from "./bot-detection-contract";

export function createBotDetectionConfig(
  settings: BotDetectionSettings,
): BotDetectionConfig {
  if (settings.BOT_DETECTION_PROVIDER === "static") {
    return botDetectionConfigSchema.parse({
      provider: "static",
      token: settings.TURNSTILE_STATIC_TOKEN,
    });
  }

  return botDetectionConfigSchema.parse({
    provider: "turnstile",
    siteKey: settings.TURNSTILE_SITE_KEY,
  });
}
