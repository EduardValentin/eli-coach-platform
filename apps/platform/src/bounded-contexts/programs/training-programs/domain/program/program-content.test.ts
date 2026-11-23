import { describe, expect, it } from "vitest";

import { mapCalendar } from "./program-content";

describe("mapCalendar", () => {
  it("builds a whole calendar from one entry per day", () => {
    // act
    const calendar = mapCalendar((day) =>
      day === "wed" ? { kind: "cardio", cardioId: "cardio" } : { kind: "rest" },
    );

    // assert
    expect(Object.keys(calendar)).toEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
    expect(calendar.wed).toEqual({ kind: "cardio", cardioId: "cardio" });
    expect(calendar.mon).toEqual({ kind: "rest" });
  });
});
