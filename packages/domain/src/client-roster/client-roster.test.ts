import { describe, expect, it } from "vitest";

import { CLIENT_STATUSES, clientStatusOf } from "./client-roster";

describe("clientStatusOf", () => {
  it.each([
    ["invited before her account is bound", false, "welcome", "invited"],
    ["onboarding once bound, before welcome", true, "welcome", "onboarding"],
    ["onboarding while she answers", true, "onboarding", "onboarding"],
    ["awaiting review once submitted", true, "submitted", "awaiting-review"],
    ["in review", true, "in-review", "in-review"],
    ["needs details", true, "needs-details", "needs-details"],
    ["approved", true, "approved", "approved"],
  ] as const)("is %s", (_label, accountBound, step, expected) => {
    // arrange
    const input = {
      accountBound,
      step,
      subscriptionStatus: "not-started" as const,
    };

    // act
    const status = clientStatusOf(input);

    // assert
    expect(status).toBe(expected);
  });

  it("derives her status from the journey when she holds no subscription", () => {
    // arrange
    const input = {
      accountBound: true,
      step: "submitted" as const,
      subscriptionStatus: null,
    };

    // act
    const status = clientStatusOf(input);

    // assert
    expect(status).toBe("awaiting-review");
  });
});

describe("CLIENT_STATUSES", () => {
  it("is the closed set of coach-facing client statuses", () => {
    // arrange
    // act
    const statuses = CLIENT_STATUSES;

    // assert
    expect(statuses).toEqual([
      "invited",
      "onboarding",
      "awaiting-review",
      "in-review",
      "needs-details",
      "approved",
      "active",
      "cancelled",
      "inactive",
    ]);
  });
});
