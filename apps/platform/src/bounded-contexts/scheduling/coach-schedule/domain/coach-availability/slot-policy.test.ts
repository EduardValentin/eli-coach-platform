import { describe, expect, it } from "vitest";

import { SlotPolicy } from "./index";

describe("SlotPolicy#coachTimeFrom", () => {
  it("holds the coach from the start through the call and its buffer", () => {
    // arrange
    const policy = SlotPolicy.of({
      durationMinutes: 60,
      bufferMinutes: 15,
      stepMinutes: 60,
      horizonDays: 14,
      leadMinutes: 0,
    });

    // act
    const coachTime = policy.coachTimeFrom(
      new Date("2026-06-01T15:00:00.000Z"),
    );

    // assert
    expect(coachTime).toEqual({
      start: new Date("2026-06-01T15:00:00.000Z"),
      end: new Date("2026-06-01T16:15:00.000Z"),
    });
  });
});

describe("SlotPolicy.of", () => {
  const ASSESSMENT_LIKE = {
    durationMinutes: 30,
    bufferMinutes: 30,
    stepMinutes: 60,
    horizonDays: 30,
    leadMinutes: 120,
  };

  it.each([
    [{ durationMinutes: 0 }],
    [{ durationMinutes: -30 }],
    [{ durationMinutes: 30.5 }],
    [{ bufferMinutes: -15 }],
    [{ bufferMinutes: 7.5 }],
    [{ stepMinutes: 0 }],
    [{ stepMinutes: 22.5 }],
    [{ stepMinutes: 15 }],
    [{ horizonDays: -1 }],
    [{ horizonDays: 1.5 }],
    [{ leadMinutes: -1 }],
    [{ leadMinutes: 0.5 }],
  ])("rejects the policy %o", (override) => {
    // arrange
    const props = { ...ASSESSMENT_LIKE, ...override };

    // act
    const create = () => SlotPolicy.of(props);

    // assert
    expect(create).toThrow(/slot policy/i);
  });

  it("accepts a step as long as the call, with no buffer, horizon or lead", () => {
    // arrange
    const props = {
      durationMinutes: 45,
      bufferMinutes: 0,
      stepMinutes: 45,
      horizonDays: 0,
      leadMinutes: 0,
    };

    // act
    const create = () => SlotPolicy.of(props);

    // assert
    expect(create).not.toThrow();
  });
});
