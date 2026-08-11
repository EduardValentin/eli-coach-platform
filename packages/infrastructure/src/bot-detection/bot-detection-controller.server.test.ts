import { describe, expect, it } from "vitest";

import type { BotDetectionConfig } from "./bot-detection-contract";
import { BotDetectionController } from "./bot-detection-controller.server";

describe("BotDetectionController", () => {
  it("returns only the public runtime challenge configuration", async () => {
    // arrange
    const controller = new BotDetectionController({
      provider: "turnstile",
      siteKey: "runtime-site-key",
    });

    // act
    const response = controller.getConfig();

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      provider: "turnstile",
      siteKey: "runtime-site-key",
    });
  });

  it("drops a field the config carries but the contract does not", async () => {
    // arrange
    const configCarryingASecret = {
      provider: "turnstile",
      siteKey: "runtime-site-key",
      secretKey: "must-not-reach-the-browser",
    } as BotDetectionConfig;
    const controller = new BotDetectionController(configCarryingASecret);

    // act
    const response = controller.getConfig();

    // assert
    await expect(response.json()).resolves.toEqual({
      provider: "turnstile",
      siteKey: "runtime-site-key",
    });
  });
});
