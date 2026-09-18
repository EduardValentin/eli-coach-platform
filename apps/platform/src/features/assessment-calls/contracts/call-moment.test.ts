import { describe, expect, it } from "vitest";

import {
  describeTimeZone,
  formatCallDay,
  formatCallMoment,
  formatCallTime,
  formatCallWeekday,
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

describe("formatCallDay", () => {
  it("names the whole calendar day in the reader's zone", () => {
    // arrange
    const startsAt = new Date("2026-03-02T23:30:00.000Z");

    // act
    const day = formatCallDay(startsAt, "Europe/Bucharest");

    // assert
    expect(day).toBe("Tuesday, 3 March 2026");
  });
});

describe("formatCallWeekday", () => {
  it("names the day a slot falls on without its year", () => {
    // arrange
    const instant = new Date("2026-03-02T15:00:00.000Z");

    // act
    const day = formatCallWeekday(instant, "Europe/Bucharest");

    // assert
    expect(day).toBe("Monday 2 March");
  });
});

describe("formatCallTime", () => {
  it("names the clock time with its day period in the reader's zone", () => {
    // arrange
    const startsAt = new Date("2026-03-02T15:00:00.000Z");

    // act
    const time = formatCallTime(startsAt, "America/New_York");

    // assert
    expect(time).toBe("10:00 AM");
  });
});

describe("describeTimeZone", () => {
  it("names the zone with the offset it carries at that instant", () => {
    // arrange
    const summer = new Date("2026-07-01T12:00:00.000Z");
    const winter = new Date("2026-12-01T12:00:00.000Z");

    // act
    const inSummer = describeTimeZone(summer, "Europe/Bucharest");
    const inWinter = describeTimeZone(winter, "Europe/Bucharest");

    // assert
    expect(inSummer).toBe("Europe/Bucharest (GMT+3)");
    expect(inWinter).toBe("Europe/Bucharest (GMT+2)");
  });
});
