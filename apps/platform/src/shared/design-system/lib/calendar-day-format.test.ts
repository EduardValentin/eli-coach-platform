import { describe, expect, it } from "vitest";

import { formatDayMonth, formatDayMonthYear } from "./calendar-day-format";

const LATE_EVENING_IN_UTC = "2026-10-10T21:25:00.000Z";

describe("calendar day formats", () => {
  it("writes an instant as the day and month it falls on in the reader's zone", () => {
    // arrange
    const instant = LATE_EVENING_IN_UTC;

    // act
    const inBucharest = formatDayMonth(instant, "Europe/Bucharest");
    const inUtc = formatDayMonth(instant, "UTC");

    // assert
    expect(inBucharest).toBe("11 October");
    expect(inUtc).toBe("10 October");
  });

  it("writes an instant as the day, month and year it falls on in the reader's zone", () => {
    // arrange
    const instant = "2026-12-31T22:30:00.000Z";

    // act
    const inBucharest = formatDayMonthYear(instant, "Europe/Bucharest");
    const inUtc = formatDayMonthYear(instant, "UTC");

    // assert
    expect(inBucharest).toBe("1 January 2027");
    expect(inUtc).toBe("31 December 2026");
  });
});
