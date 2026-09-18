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
