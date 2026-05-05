import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { TURNSTILE_TEST_SECRET_KEY } from "@eli-coach-platform/config";

import type { BotVerifier } from "./bot-verifier.server";
import { StaticTokenBotVerifier } from "./bot-verifier.server";
import { TurnstileBotVerifier } from "./turnstile-bot-verifier.server";

type CreateBotVerifierOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createBotVerifier(options: CreateBotVerifierOptions): BotVerifier {
  if (options.runtimeEnvironment.NODE_ENV === "test") {
    return new StaticTokenBotVerifier();
  }

  return new TurnstileBotVerifier({
    actionPolicy: resolveSiteverifyActionPolicy(
      options.runtimeEnvironment.TURNSTILE_SECRET_KEY,
    ),
    secretKey: options.runtimeEnvironment.TURNSTILE_SECRET_KEY,
  });
}

function resolveSiteverifyActionPolicy(secretKey: string): "testing" | undefined {
  return secretKey === TURNSTILE_TEST_SECRET_KEY ? "testing" : undefined;
}
