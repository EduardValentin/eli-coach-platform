import { describe, expect, it } from "vitest";

import {
  CoachingStanding,
  type CoachingStandingSnapshot,
} from "./coaching-standing";

const ACCESS_END = new Date("2027-01-02T10:00:00.000Z");
const ONE_MINUTE = 60 * 1000;
const BEFORE_ACCESS_END = new Date(ACCESS_END.getTime() - ONE_MINUTE);
const AFTER_ACCESS_END = new Date(ACCESS_END.getTime() + ONE_MINUTE);

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

describe("CoachingStanding.at", () => {
  it.each([
    ["not started", {}, BEFORE_ACCESS_END, "not-started"],
    ["not started", {}, AFTER_ACCESS_END, "not-started"],
    ["active", { status: "active" }, AFTER_ACCESS_END, "active"],
    [
      "cancelled before its access end",
      { status: "cancelled", accessEndsAt: ACCESS_END },
      BEFORE_ACCESS_END,
      "cancelled",
    ],
    [
      "cancelled at its access end",
      { status: "cancelled", accessEndsAt: ACCESS_END },
      ACCESS_END,
      "ended",
    ],
    [
      "cancelled after its access end",
      { status: "cancelled", accessEndsAt: ACCESS_END },
      AFTER_ACCESS_END,
      "ended",
    ],
    [
      "ended",
      { status: "ended", accessEndsAt: ACCESS_END },
      BEFORE_ACCESS_END,
      "ended",
    ],
  ] as const)(
    "reads a standing %s at the instant given as %s",
    (_label, overrides, now, expected) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const status = standing.at(now);

      // assert
      expect(status).toBe(expected);
    },
  );
});

describe("CoachingStanding.isCancelledOrEnded", () => {
  it.each([
    [{}, false],
    [{ status: "active" }, false],
    [{ status: "cancelled", accessEndsAt: ACCESS_END }, true],
    [{ status: "ended", accessEndsAt: ACCESS_END }, true],
  ] as const)(
    "reads %o as cancelled or ended from its recorded status alone: %s",
    (overrides, expected) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const cancelledOrEnded = standing.isCancelledOrEnded();

      // assert
      expect(cancelledOrEnded).toBe(expected);
    },
  );
});

describe("CoachingStanding.coachingEndsAt", () => {
  it.each([
    { situation: "not started", overrides: {}, expected: null },
    {
      situation: "active",
      overrides: { status: "active", accessEndsAt: ACCESS_END },
      expected: null,
    },
    {
      situation: "cancelled",
      overrides: { status: "cancelled", accessEndsAt: ACCESS_END },
      expected: ACCESS_END,
    },
    {
      situation: "ended",
      overrides: { status: "ended", accessEndsAt: ACCESS_END },
      expected: ACCESS_END,
    },
  ] as const)(
    "ends the coaching of a $situation standing at $expected",
    ({ overrides, expected }) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const endsAt = standing.coachingEndsAt();

      // assert
      expect(endsAt).toEqual(expected);
    },
  );
});

describe("CoachingStanding.hasPortalAccessAt", () => {
  it.each([
    [{}, AFTER_ACCESS_END, true],
    [{ status: "active" }, AFTER_ACCESS_END, true],
    [
      { status: "cancelled", accessEndsAt: ACCESS_END },
      BEFORE_ACCESS_END,
      true,
    ],
    [{ status: "cancelled", accessEndsAt: ACCESS_END }, ACCESS_END, false],
    [{ status: "ended", accessEndsAt: ACCESS_END }, BEFORE_ACCESS_END, false],
  ] as const)(
    "grants portal access to %o at %s: %s",
    (overrides, now, expected) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const access = standing.hasPortalAccessAt(now);

      // assert
      expect(access).toBe(expected);
    },
  );
});

describe("CoachingStanding.refundDue", () => {
  it.each([
    [{ status: "ended", accessEndsAt: ACCESS_END, refundDue: true }, true],
    [{ status: "ended", accessEndsAt: ACCESS_END, refundDue: false }, false],
    [{ refundDue: false }, false],
  ] as const)(
    "carries whether a refund is still owed for %o: %s",
    (overrides, expected) => {
      // arrange
      const standing = standingOf(overrides);

      // act
      const { refundDue } = standing.toSnapshot();

      // assert
      expect(refundDue).toBe(expected);
    },
  );
});

describe("CoachingStanding.toSnapshot", () => {
  it("returns the recorded status, access end, refund due and bundle months", () => {
    // arrange
    const snapshot: CoachingStandingSnapshot = {
      status: "cancelled",
      accessEndsAt: ACCESS_END,
      refundDue: true,
      bundleMonths: 6,
    };

    // act
    const restored = CoachingStanding.of(snapshot).toSnapshot();

    // assert
    expect(restored).toEqual(snapshot);
  });
});
