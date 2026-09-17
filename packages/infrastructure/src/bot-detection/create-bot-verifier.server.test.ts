import { describe, expect, it } from "vitest";

import { createBotVerifier } from "./create-bot-verifier.server";
import { StaticTokenBotVerifier } from "./bot-verifier.server";
import { TurnstileBotVerifier } from "./turnstile-bot-verifier.server";

const settings = {
  BOT_DETECTION_PROVIDER: "static" as const,
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
  TURNSTILE_SITEVERIFY_URL:
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  TURNSTILE_STATIC_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
};

describe("createBotVerifier", () => {
  it("returns a static verifier when the provider setting is static", async () => {
    // arrange
    const staticSettings = {
      ...settings,
      BOT_DETECTION_PROVIDER: "static" as const,
    };

    // act
    const verifier = createBotVerifier(staticSettings);

    // assert
    expect(verifier).toBeInstanceOf(StaticTokenBotVerifier);
    const result = await verifier.verifySubmission({
      action: "test",
      remoteIp: null,
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
    expect(result).toEqual({ status: "verified" });
    const rejectedResult = await verifier.verifySubmission({
      action: "test",
      remoteIp: null,
      token: "WRONG.TOKEN.VALUE",
    });
    expect(rejectedResult).toEqual({ status: "rejected" });
  });

  it("returns a Turnstile verifier when the provider setting is turnstile", () => {
    // arrange
    const turnstileSettings = {
      ...settings,
      BOT_DETECTION_PROVIDER: "turnstile" as const,
    };

    // act
    const verifier = createBotVerifier(turnstileSettings);

    // assert
    expect(verifier).toBeInstanceOf(TurnstileBotVerifier);
  });
});
