import { describe, expect, it } from "vitest";

import { createBotDetectionConfig } from "./bot-detection-config.server";

const settings = {
  BOT_DETECTION_PROVIDER: "static" as const,
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
  TURNSTILE_SITE_KEY: "1x00000000000000000000BB",
  TURNSTILE_SITEVERIFY_URL:
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  TURNSTILE_STATIC_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
};

describe("createBotDetectionConfig", () => {
  it("publishes the static token when the provider setting is static", () => {
    // arrange
    const staticSettings = {
      ...settings,
      BOT_DETECTION_PROVIDER: "static" as const,
    };

    // act
    const config = createBotDetectionConfig(staticSettings);

    // assert
    expect(config).toEqual({
      provider: "static",
      token: "XXXX.DUMMY.TOKEN.XXXX",
    });
  });

  it("publishes the Turnstile site key when the provider setting is turnstile", () => {
    // arrange
    const turnstileSettings = {
      ...settings,
      BOT_DETECTION_PROVIDER: "turnstile" as const,
      TURNSTILE_SITE_KEY: "0x4AAAAAAA",
    };

    // act
    const config = createBotDetectionConfig(turnstileSettings);

    // assert
    expect(config).toEqual({ provider: "turnstile", siteKey: "0x4AAAAAAA" });
  });
});
