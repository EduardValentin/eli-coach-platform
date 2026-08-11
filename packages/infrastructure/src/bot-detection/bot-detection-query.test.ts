// @vitest-environment happy-dom

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  BOT_DETECTION_API_URL,
  fetchBotDetectionConfig,
} from "./bot-detection-query";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("bot detection query", () => {
  it("loads the runtime Turnstile site key through the public API", async () => {
    // arrange
    server.use(
      http.get(BOT_DETECTION_API_URL, () =>
        HttpResponse.json({
          provider: "turnstile",
          siteKey: "runtime-site-key",
        }),
      ),
    );

    // act
    const config = fetchBotDetectionConfig(
      new AbortController().signal,
    );

    // assert
    await expect(config).resolves.toEqual({
      provider: "turnstile",
      siteKey: "runtime-site-key",
    });
  });

  it("loads the static provider token through the public API", async () => {
    // arrange
    server.use(
      http.get(BOT_DETECTION_API_URL, () =>
        HttpResponse.json({
          provider: "static",
          token: "static-token",
        }),
      ),
    );

    // act
    const config = fetchBotDetectionConfig(
      new AbortController().signal,
    );

    // assert
    await expect(config).resolves.toEqual({
      provider: "static",
      token: "static-token",
    });
  });

  it("rejects a provider it does not recognise", async () => {
    // arrange
    server.use(
      http.get(BOT_DETECTION_API_URL, () =>
        HttpResponse.json({ provider: "recaptcha", siteKey: "other-key" }),
      ),
    );

    // act
    const config = fetchBotDetectionConfig(
      new AbortController().signal,
    );

    // assert
    await expect(config).rejects.toThrow(
      "Bot detection configuration is unavailable.",
    );
  });

  it("rejects a provider whose credential is present but empty", async () => {
    // arrange
    server.use(
      http.get(BOT_DETECTION_API_URL, () =>
        HttpResponse.json({ provider: "static", token: "" }),
      ),
    );

    // act
    const config = fetchBotDetectionConfig(
      new AbortController().signal,
    );

    // assert
    await expect(config).rejects.toThrow(
      "Bot detection configuration is unavailable.",
    );
  });

  it("rejects unavailable and malformed runtime configuration", async () => {
    // arrange
    server.use(
      http.get(BOT_DETECTION_API_URL, () =>
        HttpResponse.json({ provider: "turnstile" }),
      ),
    );

    // act
    const config = fetchBotDetectionConfig(
      new AbortController().signal,
    );

    // assert
    await expect(config).rejects.toThrow(
      "Bot detection configuration is unavailable.",
    );
  });
});
