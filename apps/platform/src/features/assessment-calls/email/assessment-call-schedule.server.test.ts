import { describe, expect, it } from "vitest";

import { formatCallMoment } from "./assessment-call-schedule.server";

describe("formatCallMoment", () => {
  it("names the day, the time and the zone the recipient reads it in", () => {
    // arrange
    const startsAt = new Date("2026-03-02T15:00:00.000Z");

    // act
    const moment = formatCallMoment(startsAt, "Europe/Bucharest");

    // assert
    expect(moment).toBe(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
  });

  it("names the same instant in the zone the other recipient reads it in", () => {
    // arrange
    const startsAt = new Date("2026-03-02T15:00:00.000Z");

    // act
    const moment = formatCallMoment(startsAt, "America/New_York");

    // assert
    expect(moment).toBe(
      "Monday, 2 March 2026 at 10:00 AM — America/New_York (GMT-5)",
    );
  });

  it("follows the offset across the Bucharest daylight-saving end", () => {
    // arrange
    const beforeChange = new Date("2026-10-24T05:00:00.000Z");
    const afterChange = new Date("2026-10-25T05:00:00.000Z");

    // act
    const before = formatCallMoment(beforeChange, "Europe/Bucharest");
    const after = formatCallMoment(afterChange, "Europe/Bucharest");

    // assert
    expect(before).toBe(
      "Saturday, 24 October 2026 at 8:00 AM — Europe/Bucharest (GMT+3)",
    );
    expect(after).toBe(
      "Sunday, 25 October 2026 at 7:00 AM — Europe/Bucharest (GMT+2)",
    );
  });
});
