import { describe, expect, it } from "vitest";

import type { ClientReachReading } from "~/bounded-contexts/clients/clients/domain/client";

import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeriesBounds } from "./check-in-series-bounds";

const MONDAY_MORNING = new Date("2026-10-05T09:00:00.000Z");
const A_DAY_LATER = new Date("2026-10-06T09:00:00.000Z");
const DAY_15 = new Date("2026-10-19T09:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-05T09:00:00.000Z");

const ANA: ClientReachReading = {
  clientId: "client-1",
  portal: "reachable",
  coachingEndsAt: null,
  programStartsAt: MONDAY_MORNING,
  paidThrough: PAID_THROUGH,
  timeZone: "Europe/London",
};

function bounds(from: Date, until: Date): CheckInSeriesBounds {
  return CheckInSeriesBounds.of({ from, until });
}

describe("CheckInSeriesBounds.ofCoaching", () => {
  it.each([
    {
      situation:
        "an immediate start, from the first day at least 24 hours away",
      client: ANA,
      expected: { from: A_DAY_LATER, until: PAID_THROUGH },
    },
    {
      situation: "a waiting start, from her program start on day 15",
      client: { ...ANA, programStartsAt: DAY_15 },
      expected: { from: DAY_15, until: PAID_THROUGH },
    },
  ])("bounds $situation", ({ client, expected }) => {
    // act
    const coaching = CheckInSeriesBounds.ofCoaching({
      client,
      now: MONDAY_MORNING,
      lead: CHECK_IN_RULES,
    });

    // assert
    expect(
      coaching instanceof CheckInSeriesBounds
        ? coaching.toSnapshot()
        : coaching,
    ).toEqual(expected);
  });

  it.each([
    {
      situation: "a paid period ending within the next 24 hours",
      client: { ...ANA, paidThrough: A_DAY_LATER },
      expected: "nothing_to_create",
    },
    {
      situation: "a client whose coaching is cancelled and ends later",
      client: { ...ANA, coachingEndsAt: new Date("2026-12-01T10:00:00.000Z") },
      expected: "client_cannot_answer",
    },
    {
      situation: "a client whose coaching has ended",
      client: { ...ANA, portal: "ended", coachingEndsAt: MONDAY_MORNING },
      expected: "client_cannot_answer",
    },
    {
      situation: "a client still onboarding",
      client: { ...ANA, portal: "awaiting_onboarding" },
      expected: "client_cannot_answer",
    },
    {
      situation: "a client without a program start",
      client: { ...ANA, programStartsAt: null },
      expected: "client_cannot_answer",
    },
    {
      situation: "a client without a paid period",
      client: { ...ANA, paidThrough: null },
      expected: "client_cannot_answer",
    },
  ] as const)("answers $expected for $situation", ({ client, expected }) => {
    // act
    const coaching = CheckInSeriesBounds.ofCoaching({
      client,
      now: MONDAY_MORNING,
      lead: CHECK_IN_RULES,
    });

    // assert
    expect(coaching).toBe(expected);
  });
});

describe("CheckInSeriesBounds#holds", () => {
  it.each([
    { situation: "its lower bound", instant: A_DAY_LATER, expected: true },
    { situation: "an instant inside", instant: DAY_15, expected: true },
    { situation: "its upper bound", instant: PAID_THROUGH, expected: false },
    {
      situation: "an instant before",
      instant: MONDAY_MORNING,
      expected: false,
    },
  ])("holds $situation: $expected", ({ instant, expected }) => {
    // act
    const holds = bounds(A_DAY_LATER, PAID_THROUGH).holds(instant);

    // assert
    expect(holds).toBe(expected);
  });
});

describe("CheckInSeriesBounds#notBefore", () => {
  it.each([
    {
      situation: "a later instant",
      instant: DAY_15,
      expected: { from: DAY_15, until: PAID_THROUGH },
    },
    {
      situation: "an earlier instant",
      instant: MONDAY_MORNING,
      expected: { from: A_DAY_LATER, until: PAID_THROUGH },
    },
  ])("starts no earlier than $situation", ({ instant, expected }) => {
    // act
    const clamped = bounds(A_DAY_LATER, PAID_THROUGH).notBefore(instant);

    // assert
    expect(clamped.toSnapshot()).toEqual(expected);
  });
});

describe("CheckInSeriesBounds#spanning", () => {
  it("widens to the earliest start and the latest end of both", () => {
    // arrange
    const cover = bounds(DAY_15, new Date("2026-11-05T09:00:00.000Z"));

    // act
    const widened = cover.spanning(bounds(A_DAY_LATER, PAID_THROUGH));

    // assert
    expect(widened.toSnapshot()).toEqual({
      from: A_DAY_LATER,
      until: PAID_THROUGH,
    });
  });
});
