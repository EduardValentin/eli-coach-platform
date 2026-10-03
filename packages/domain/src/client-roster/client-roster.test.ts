import { describe, expect, it } from "vitest";

import { CLIENT_STATUSES, clientStatusOf } from "./client-roster";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const LATER = new Date("2027-01-02T10:00:00.000Z");

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
      subscription: { status: "not-started" as const, accessEndsAt: null },
      now: NOW,
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
      subscription: null,
      now: NOW,
    };

    // act
    const status = clientStatusOf(input);

    // assert
    expect(status).toBe("awaiting-review");
  });

  it.each([
    ["active", { status: "active", accessEndsAt: null }, "active"],
    ["cancelled", { status: "cancelled", accessEndsAt: LATER }, "cancelled"],
    [
      "inactive once her cancelled access has run out",
      { status: "cancelled", accessEndsAt: NOW },
      "inactive",
    ],
    ["inactive once ended", { status: "ended", accessEndsAt: NOW }, "inactive"],
  ] as const)(
    "reads her subscription as %s over her journey",
    (_label, subscription, expected) => {
      // arrange
      const input = {
        accountBound: true,
        step: "approved" as const,
        subscription,
        now: NOW,
      };

      // act
      const status = clientStatusOf(input);

      // assert
      expect(status).toBe(expected);
    },
  );

  it.each([
    ["cancelled", { status: "cancelled", accessEndsAt: LATER }, "cancelled"],
    ["inactive", { status: "ended", accessEndsAt: NOW }, "inactive"],
  ] as const)(
    "reads her cancelled or ended subscription as %s before her account is bound",
    (_label, subscription, expected) => {
      // arrange
      const input = {
        accountBound: false,
        step: "welcome" as const,
        subscription,
        now: NOW,
      };

      // act
      const status = clientStatusOf(input);

      // assert
      expect(status).toBe(expected);
    },
  );

  it("keeps her invited before her account is bound while her coaching is open", () => {
    // arrange
    const input = {
      accountBound: false,
      step: "welcome" as const,
      subscription: { status: "active" as const, accessEndsAt: null },
      now: NOW,
    };

    // act
    const status = clientStatusOf(input);

    // assert
    expect(status).toBe("invited");
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
