import { describe, expect, it } from "vitest";

import { resolveDeliveryLimitKey } from "./delivery-limit-key";

describe("resolveDeliveryLimitKey", () => {
  it.each([
    ["woman+guides@example.com", "woman@example.com"],
    ["woman@example.com", "woman@example.com"],
    ["woman+one+two@example.com", "woman@example.com"],
    ["woman@sub.example.com", "woman@sub.example.com"],
    ["not-an-email", "not-an-email"],
    // A local part that is only a tag folds to a bare domain key. Such an
    // address collides with others of the same shape, which is acceptable
    // because no provider issues a mailbox without a base name.
    ["+guides@example.com", "@example.com"],
  ])("folds %s to %s", (normalizedEmail, expected) => {
    // arrange, act
    const limitKey = resolveDeliveryLimitKey(normalizedEmail);

    // assert
    expect(limitKey).toBe(expected);
  });
});
