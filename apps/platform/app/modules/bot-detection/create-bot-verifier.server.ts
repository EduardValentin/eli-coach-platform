import type { RuntimeEnvironment } from "@eli-coach-platform/config";

import type { BotVerifier } from "./bot-verifier.server";
import { StaticTokenBotVerifier } from "./bot-verifier.server";
import { usesStaticBotDetection } from "./bot-detection-config.server";
import { TurnstileBotVerifier } from "./turnstile-bot-verifier.server";

type CreateBotVerifierOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createBotVerifier(options: CreateBotVerifierOptions): BotVerifier {
  if (usesStaticBotDetection(options.runtimeEnvironment)) {
    return new StaticTokenBotVerifier({
      validToken: options.runtimeEnvironment.TURNSTILE_STATIC_TOKEN,
    });
  }

  return new TurnstileBotVerifier({
    secretKey: options.runtimeEnvironment.TURNSTILE_SECRET_KEY,
    siteverifyUrl: options.runtimeEnvironment.TURNSTILE_SITEVERIFY_URL,
  });
}
