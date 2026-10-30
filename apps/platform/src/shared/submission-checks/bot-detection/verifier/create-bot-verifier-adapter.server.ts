import type { BotDetectionSettings } from "~/shared/submission-checks/bot-detection-settings";

import type { BotVerifierPort } from "./bot-verifier-port.server";
import { StaticTokenBotVerifierAdapter } from "./static-token-bot-verifier-adapter.server";
import { TurnstileBotVerifierAdapter } from "~/shared/submission-checks/bot-detection/turnstile/turnstile-bot-verifier-adapter.server";

export function createBotVerifierAdapter(
  settings: BotDetectionSettings,
): BotVerifierPort {
  if (settings.BOT_DETECTION_PROVIDER === "static") {
    return new StaticTokenBotVerifierAdapter({
      validToken: settings.TURNSTILE_STATIC_TOKEN,
    });
  }

  return new TurnstileBotVerifierAdapter({
    secretKey: settings.TURNSTILE_SECRET_KEY,
    siteverifyUrl: settings.TURNSTILE_SITEVERIFY_URL,
  });
}
