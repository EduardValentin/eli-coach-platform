import { describe, expect, it } from "vitest";

import { decideReducedPricingRegistration } from "./waitlist-registration";

describe("decideReducedPricingRegistration", () => {
  it.each([
    [{ alreadyRegistered: true, cap: 10, reducedPricingCount: 10 }, "already_registered"],
    [{ alreadyRegistered: false, cap: 10, reducedPricingCount: 10 }, "capacity_reached"],
    [{ alreadyRegistered: false, cap: 10, reducedPricingCount: 9 }, "register"],
    [{ alreadyRegistered: false, cap: 0, reducedPricingCount: 0 }, "capacity_reached"],
  ] as const)("decides %o as %s", (input, expected) => {
    // arrange
    const decisionInput = input;

    // act
    const decision = decideReducedPricingRegistration(decisionInput);

    // assert
    expect(decision).toBe(expected);
  });
});
