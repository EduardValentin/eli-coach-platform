import { describe, expect, it } from "vitest";

import {
  formatCallMoment,
  formatDayFirstDate,
  formatShortDay,
} from "./call-moment";

describe("formatCallMoment", () => {
  it("names the day, the time and the zone the reader reads it in", () => {
    // arrange
    const startsAt = new Date("2026-03-02T15:00:00.000Z");

    // act
    const moment = formatCallMoment(startsAt, "Europe/Bucharest");

    // assert
    expect(moment).toBe(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
  });

  it("names the same instant in the zone another reader reads it in", () => {
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

describe("formatDayFirstDate", () => {
  it("names the whole calendar day in the reader's zone", () => {
    // arrange
    const startsAt = new Date("2026-03-02T23:30:00.000Z");

    // act
    const day = formatDayFirstDate(startsAt, "Europe/Bucharest");

    // assert
    expect(day).toBe("Tuesday, 3 March 2026");
  });
});

describe("formatShortDay", () => {
  it("shortens the day to the wording a dense list can carry", () => {
    // arrange
    const startsAt = new Date("2026-09-19T21:36:00.000Z");

    // act
    const day = formatShortDay(startsAt, "Europe/Bucharest");

    // assert
    expect(day).toBe("Sun, Sep 20");
  });

  it("shortens the same instant to the day the reader's zone is on", () => {
    // arrange
    const startsAt = new Date("2026-09-19T21:36:00.000Z");

    // act
    const day = formatShortDay(startsAt, "America/Los_Angeles");

    // assert
    expect(day).toBe("Sat, Sep 19");
  });
});
