import { describe, expect, it } from "vitest";

import { subscriptionStandingOf } from "./stripe-subscription-standing.server";

describe("subscriptionStandingOf", () => {
  it.each([
    ["canceled", "ended"],
    ["incomplete_expired", "ended"],
    ["past_due", "payment-problem"],
    ["unpaid", "payment-problem"],
    ["active", "healthy"],
    ["trialing", "other"],
    ["incomplete", "other"],
  ] as const)("reads Stripe's %s status as %s", (status, expected) => {
    // act
    const standing = subscriptionStandingOf(status);

    // assert
    expect(standing).toBe(expected);
  });
});
