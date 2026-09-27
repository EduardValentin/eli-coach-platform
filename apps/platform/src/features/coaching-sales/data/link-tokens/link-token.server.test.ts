import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { LinkTokenSha256, RandomLinkTokenGenerator } from "./link-token.server";

describe("link tokens", () => {
  it("creates an unguessable url-safe token of at least 128 bits for every payment link and invitation", () => {
    // arrange
    const generator = new RandomLinkTokenGenerator();

    // act
    const token = generator.create();
    const nextToken = generator.create();

    // assert
    expect(token.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token.rawToken, "base64url")).toHaveLength(32);
    expect(nextToken.rawToken).not.toBe(token.rawToken);
  });

  it("stores only the hex sha256 of the raw token, the same digest the hasher computes", () => {
    // arrange
    const generator = new RandomLinkTokenGenerator();
    const hasher = new LinkTokenSha256();

    // act
    const token = generator.create();

    // assert
    expect(token.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(token.sha256).toBe(hasher.sha256(token.rawToken));
    expect(token.sha256).toBe(
      createHash("sha256").update(token.rawToken).digest("hex"),
    );
  });
});
