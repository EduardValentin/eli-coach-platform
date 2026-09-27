import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  PaymentLinkTokenSha256,
  RandomPaymentLinkTokenGenerator,
} from "./payment-link-token.server";

describe("payment link tokens", () => {
  it("creates an unguessable url-safe token of at least 128 bits for every link", () => {
    // arrange
    const generator = new RandomPaymentLinkTokenGenerator();

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
    const generator = new RandomPaymentLinkTokenGenerator();
    const hasher = new PaymentLinkTokenSha256();

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
