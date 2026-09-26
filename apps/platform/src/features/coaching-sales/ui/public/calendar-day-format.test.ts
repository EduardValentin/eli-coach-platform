import { describe, expect, it } from "vitest";

import { formatDayMonth, formatDayMonthYear } from "./calendar-day-format";

describe("calendar day formats", () => {
  it("writes a calendar day as its day and month", () => {
    // arrange
    const day = "2026-10-01";

    // act
    const formatted = formatDayMonth(day);

    // assert
    expect(formatted).toBe("1 October");
  });

  it("writes a calendar day as its day, month and year", () => {
    // arrange
    const day = "2026-12-31";

    // act
    const formatted = formatDayMonthYear(day);

    // assert
    expect(formatted).toBe("31 December 2026");
  });
});
