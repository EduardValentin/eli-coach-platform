import { describe, expect, it, vi } from "vitest";

import { TurnstileBotVerifier } from "./turnstile-bot-verifier.server";

describe("TurnstileBotVerifier", () => {
  it("validates public submission tokens with Cloudflare Siteverify", async () => {
    // arrange
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

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: "203.0.113.4",
      token: "turnstile-token",
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "verified" });
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
    // arrange
    const fetchSiteverify = vi.fn();
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: null,
      token: null,
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "rejected" });
    expect(fetchSiteverify).not.toHaveBeenCalled();
  });

  it("rejects tokens when Siteverify returns the wrong action", async () => {
    // arrange
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

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: null,
      token: "turnstile-token",
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "rejected" });
  });

  it("reports verification as unavailable when Siteverify cannot be reached", async () => {
    // arrange
    const fetchSiteverify = vi.fn().mockRejectedValue(new Error("network unavailable"));
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: null,
      token: "turnstile-token",
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "unavailable" });
  });

  it("reports verification as unavailable when Siteverify returns an HTTP failure", async () => {
    // arrange
    const fetchSiteverify = vi.fn().mockResolvedValue(
      new Response(null, { status: 503 }),
    );
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: null,
      token: "turnstile-token",
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "unavailable" });
  });

  it("reports verification as unavailable when Siteverify returns an invalid response", async () => {
    // arrange
    const fetchSiteverify = vi.fn().mockResolvedValue(
      Response.json({ action: "waitlist_join" }),
    );
    const verifier = new TurnstileBotVerifier({
      fetchSiteverify,
      secretKey: "turnstile-secret",
      siteverifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    });

    // act
    const verification = verifier.verifySubmission({
      action: "waitlist_join",
      remoteIp: null,
      token: "turnstile-token",
    });

    // assert
    await expect(verification).resolves.toEqual({ status: "unavailable" });
  });
});
