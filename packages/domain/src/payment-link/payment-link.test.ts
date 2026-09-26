import { describe, expect, it } from "vitest";

import { PaymentLink, type PaymentLinkState } from "./payment-link";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const EXPIRES_AT = new Date("2026-10-26T10:00:00.000Z");

function linkIn(state: PaymentLinkState): PaymentLink {
  return PaymentLink.reconstitute({
    id: "link-1",
    assessmentCallId: "call-1",
    tokenSha256: "a".repeat(64),
    createdAt: NOW,
    expiresAt: EXPIRES_AT,
    state,
    paymentCustomerId: null,
  });
}

describe("PaymentLink.issue", () => {
  it("issues a link that expires 30 days after it was created", () => {
    // act
    const link = PaymentLink.issue({
      assessmentCallId: "call-1",
      tokenSha256: "a".repeat(64),
      now: NOW,
    });

    // assert
    expect(link).toEqual({
      assessmentCallId: "call-1",
      tokenSha256: "a".repeat(64),
      createdAt: NOW,
      expiresAt: EXPIRES_AT,
    });
  });
});

describe("PaymentLink.isUsable", () => {
  it.each<[string, PaymentLinkState, Date, boolean]>([
    [
      "a valid link one millisecond before expiry is usable",
      "valid",
      new Date(EXPIRES_AT.getTime() - 1),
      true,
    ],
    ["a valid link at expiry is not usable", "valid", EXPIRES_AT, false],
    ["a voided link is not usable", "voided", NOW, false],
    ["a spent link is not usable", "spent", NOW, false],
  ])("%s", (_label, state, now, expected) => {
    // arrange
    const link = linkIn(state);

    // act
    const usable = link.isUsable(now);

    // assert
    expect(usable).toBe(expected);
  });
});

describe("PaymentLink.isPlausibleToken", () => {
  it.each([
    ["an empty token is not plausible", "", false],
    ["a five-character token is not plausible", "abcde", false],
    ["a six-character token is plausible", "abcdef", true],
  ])("%s", (_label, rawToken, expected) => {
    // act
    const plausible = PaymentLink.isPlausibleToken(rawToken);

    // assert
    expect(plausible).toBe(expected);
  });
});
