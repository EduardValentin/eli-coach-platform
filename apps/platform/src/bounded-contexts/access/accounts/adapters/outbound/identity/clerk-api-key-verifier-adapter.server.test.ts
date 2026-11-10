import { ClerkAPIResponseError } from "@clerk/backend/errors";
import { describe, expect, it, vi } from "vitest";

import { ClerkApiKeyVerifierAdapter } from "./clerk-api-key-verifier-adapter.server";

function clerkError(status: number, code: string): ClerkAPIResponseError {
  return new ClerkAPIResponseError("Clerk refused the request", {
    data: [{ code, message: code }],
    status,
  });
}

type VerifiedApiKey = { subject: string };

function clientVerifying(verify: (secret: string) => Promise<VerifiedApiKey>) {
  return { apiKeys: { verify } };
}

describe("ClerkApiKeyVerifierAdapter#verify", () => {
  it("answers the user a valid key was issued to", async () => {
    // arrange
    const verify = vi
      .fn<(secret: string) => Promise<VerifiedApiKey>>()
      .mockResolvedValue({ subject: "user_coach" });
    const clerkApiKeyVerifierAdapter = new ClerkApiKeyVerifierAdapter(
      clientVerifying(verify),
    );

    // act
    const holder = await clerkApiKeyVerifierAdapter.verify("ak_coach");

    // assert
    expect(holder).toEqual({ authSubjectId: "user_coach" });
    expect(verify).toHaveBeenCalledWith("ak_coach");
  });

  it("answers nobody for a valid key issued to an organization", async () => {
    // arrange
    const clerkApiKeyVerifierAdapter = new ClerkApiKeyVerifierAdapter(
      clientVerifying(vi.fn().mockResolvedValue({ subject: "org_evoa" })),
    );

    // act
    const holder = await clerkApiKeyVerifierAdapter.verify("ak_organization");

    // assert
    expect(holder).toBeNull();
  });

  it.each([
    ["unknown, revoked or expired", 404, "api_key_not_found"],
    ["refused for another key reason", 400, "api_key_invalid"],
  ])(
    "answers nobody for a key Clerk reports %s",
    async (_label, status, code) => {
      // arrange
      const clerkApiKeyVerifierAdapter = new ClerkApiKeyVerifierAdapter(
        clientVerifying(vi.fn().mockRejectedValue(clerkError(status, code))),
      );

      // act
      const holder = await clerkApiKeyVerifierAdapter.verify("ak_unknown");

      // assert
      expect(holder).toBeNull();
    },
  );

  it.each([
    [
      "refuses the instance's own secret key",
      clerkError(401, "clerk_key_invalid"),
    ],
    ["has the feature switched off", clerkError(403, "feature_not_enabled")],
    ["fails on its side", clerkError(500, "internal_clerk_error")],
    ["limits the rate", clerkError(429, "too_many_requests")],
    ["cannot be reached", clerkError(0, "unexpected_error")],
    ["answers with no error code", new Error("socket hang up")],
  ])("lets the failure through when Clerk %s", async (_label, failure) => {
    // arrange
    const clerkApiKeyVerifierAdapter = new ClerkApiKeyVerifierAdapter(
      clientVerifying(vi.fn().mockRejectedValue(failure)),
    );

    // act
    const verification = clerkApiKeyVerifierAdapter.verify("ak_coach");

    // assert
    await expect(verification).rejects.toBe(failure);
  });
});
