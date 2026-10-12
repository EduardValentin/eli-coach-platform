import { describe, expect, it } from "vitest";

import { CoachingStanding, type CoachingStandingSnapshot } from "../client";

import { CLIENT_STATUSES, clientStatusOf } from "./client-roster";

const NOW = new Date("2026-10-20T10:00:00.000Z");
const LATER = new Date("2027-01-02T10:00:00.000Z");

function standingOf(
  recorded: Pick<CoachingStandingSnapshot, "status" | "accessEndsAt">,
): CoachingStanding {
  return CoachingStanding.of({
    ...recorded,
    refundDue: false,
    bundleMonths: 3,
  });
}

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
      standing: standingOf({ status: "not-started", accessEndsAt: null }),
      now: NOW,
    };

    // act
    const status = clientStatusOf(input);

    // assert
    expect(status).toBe(expected);
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
    "reads her coaching as %s over her journey",
    (_label, recorded, expected) => {
      // arrange
      const input = {
        accountBound: true,
        step: "approved" as const,
        standing: standingOf(recorded),
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
    "reads her cancelled or ended coaching as %s before her account is bound",
    (_label, recorded, expected) => {
      // arrange
      const input = {
        accountBound: false,
        step: "welcome" as const,
        standing: standingOf(recorded),
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
      standing: standingOf({ status: "active", accessEndsAt: null }),
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
