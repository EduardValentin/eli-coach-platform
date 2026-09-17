import type { BotDetectionSettings } from "@eli-coach-platform/config";
import type { BotVerifier } from "@eli-coach-platform/domain/shared";

import { StaticTokenBotVerifier } from "./bot-verifier.server";
import { TurnstileBotVerifier } from "../turnstile/turnstile-bot-verifier.server";

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
