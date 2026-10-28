import type { BotDetectionSettings } from "~/shared/submission-checks/bot-detection-settings";

import type { BotVerifier } from "./bot-verifier-contract.server";
import { StaticTokenBotVerifier } from "./bot-verifier.server";
import { TurnstileBotVerifier } from "~/shared/submission-checks/bot-detection/turnstile/turnstile-bot-verifier.server";

export function createBotVerifier(settings: BotDetectionSettings): BotVerifier {
  if (settings.BOT_DETECTION_PROVIDER === "static") {
    return new StaticTokenBotVerifier({
      validToken: settings.TURNSTILE_STATIC_TOKEN,
    });
  }

  return new TurnstileBotVerifier({
    secretKey: settings.TURNSTILE_SECRET_KEY,
    siteverifyUrl: settings.TURNSTILE_SITEVERIFY_URL,
  });
}
