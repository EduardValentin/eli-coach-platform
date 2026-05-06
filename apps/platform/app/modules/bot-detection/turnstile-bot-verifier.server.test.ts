import { describe, expect, it, vi } from "vitest";

import { TurnstileBotVerifier } from "./turnstile-bot-verifier.server";

describe("TurnstileBotVerifier", () => {
  it("validates public submission tokens with Cloudflare Siteverify", async () => {
    const fetchSiteverify = vi.fn().mockResolvedValue(
      Response.json({
        action: "waitlist_join",
        hostname: "localhost",
        success: true,
      }),
    );
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    await expect(
      verifier.verifySubmission({
        action: "waitlist_join",
        remoteIp: "203.0.113.4",
        token: "turnstile-token",
      }),
    ).resolves.toEqual({ valid: true });

    expect(fetchSiteverify).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body: {
          remoteip: "203.0.113.4",
          response: "turnstile-token",
          secret: "turnstile-secret",
        },
        method: "POST",
      },
    );
  });

  it("rejects missing tokens without calling Siteverify", async () => {
    const fetchSiteverify = vi.fn();
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    await expect(
      verifier.verifySubmission({
        action: "waitlist_join",
        remoteIp: null,
        token: null,
      }),
    ).resolves.toEqual({ valid: false });

    expect(fetchSiteverify).not.toHaveBeenCalled();
  });

  it("rejects tokens when Siteverify returns the wrong action", async () => {
    const fetchSiteverify = vi.fn().mockResolvedValue(
      Response.json({
        action: "other_action",
        hostname: "localhost",
        success: true,
      }),
    );
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    await expect(
      verifier.verifySubmission({
        action: "waitlist_join",
        remoteIp: null,
        token: "turnstile-token",
      }),
    ).resolves.toEqual({ valid: false });
  });

  it("rejects tokens when Siteverify cannot be reached", async () => {
    const fetchSiteverify = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    await expect(
      verifier.verifySubmission({
        action: "waitlist_join",
        remoteIp: null,
        token: "turnstile-token",
      }),
    ).resolves.toEqual({ valid: false });
  });
});
