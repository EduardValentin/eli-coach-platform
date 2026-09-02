import { describe, expect, it } from "vitest";

import {
  InvitationPayloadSha256Digest,
  InvitationTokenSha256,
  RandomInvitationTokenGenerator,
} from "./invitation-token.server";

describe("issuing an invitation token", () => {
  it("never issues the same token twice", () => {
    // arrange
    const generator = new RandomInvitationTokenGenerator();

    // act
    const tokens = new Set(
      Array.from({ length: 100 }, () => generator.generateToken()),
    );

    // assert
    expect(tokens.size).toBe(100);
  });

  it("issues a token that survives a URL without escaping", () => {
    // arrange & act
    const token = new RandomInvitationTokenGenerator().generateToken();

    // assert — base64url, so the emailed link needs no encoding
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(token)).toBe(token);
  });
});

describe("hashing", () => {
  it("hashes a token to the same digest every time", () => {
    // arrange
    const hasher = new InvitationTokenSha256();

    // act & assert — the stored hash has to match on the way back in
    expect(hasher.hashToken("token-a")).toBe(hasher.hashToken("token-a"));
  });

  it("gives different tokens different digests", () => {
    // arrange
    const hasher = new InvitationTokenSha256();

    // act & assert
    expect(hasher.hashToken("token-a")).not.toBe(hasher.hashToken("token-b"));
  });

  it("produces a digest that fits the stored column", () => {
    // arrange & act
    const digest = new InvitationTokenSha256().hashToken("token-a");

    // assert — sha256 hex is 64 characters, matching varchar(64)
    expect(digest).toHaveLength(64);
  });

  it("digests a payload so a replay can be told from a conflict", () => {
    // arrange
    const digester = new InvitationPayloadSha256Digest();

    // act & assert
    expect(digester.digestPayload("a")).toBe(digester.digestPayload("a"));
    expect(digester.digestPayload("a")).not.toBe(digester.digestPayload("b"));
  });
});
