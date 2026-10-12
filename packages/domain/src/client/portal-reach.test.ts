import { describe, expect, it } from "vitest";

import {
  CoachingStanding,
  type CoachingStandingSnapshot,
} from "./coaching-standing";
import { portalReachOf } from "./portal-reach";

const NOW = new Date("2026-10-12T10:00:00.000Z");
const SUBMITTED_AT = new Date("2026-10-01T10:00:00.000Z");
const LATER = new Date("2026-11-01T10:00:00.000Z");
const EARLIER = new Date("2026-10-01T10:00:00.000Z");

function standingOf(
  overrides: Partial<CoachingStandingSnapshot> = {},
): CoachingStanding {
  return CoachingStanding.of({
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
    ...overrides,
  });
}

describe("portalReachOf", () => {
  it.each([
    ["not started, submitted", {}, SUBMITTED_AT, "reachable"],
    ["active, submitted", { status: "active" }, SUBMITTED_AT, "reachable"],
    [
      "cancelled with access left, submitted",
      { status: "cancelled", accessEndsAt: LATER },
      SUBMITTED_AT,
      "reachable",
    ],
    ["not started, not submitted", {}, null, "awaiting_onboarding"],
    [
      "active, not submitted",
      { status: "active" },
      null,
      "awaiting_onboarding",
    ],
    [
      "cancelled with access left, not submitted",
      { status: "cancelled", accessEndsAt: LATER },
      null,
      "awaiting_onboarding",
    ],
    [
      "cancelled with access run out, submitted",
      { status: "cancelled", accessEndsAt: EARLIER },
      SUBMITTED_AT,
      "ended",
    ],
    [
      "cancelled with access run out, not submitted",
      { status: "cancelled", accessEndsAt: EARLIER },
      null,
      "ended",
    ],
    [
      "ended, submitted",
      { status: "ended", accessEndsAt: LATER },
      SUBMITTED_AT,
      "ended",
    ],
  ] as const)(
    "reaches the portal of a client %s as %s",
    (_label, overrides, onboardingSubmittedAt, expected) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const portal = portalReachOf({
        standing,
        onboardingSubmittedAt,
        now: NOW,
      });

      // assert
      expect(portal).toBe(expected);
    },
  );
});
