import { describe, expect, it } from "vitest";

import {
  addDays,
  instantToWallClock,
  wallClockToInstant,
  weekdayIndexOf,
} from "./zoned-time";

describe("instantToWallClock", () => {
  it("reads the summer offset before the Bucharest autumn change", () => {
    // arrange
    const instant = new Date("2026-10-25T00:30:00.000Z");

    // act
    const wallClock = instantToWallClock(instant, "Europe/Bucharest");

    // assert
    expect(wallClock).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 3,
      minute: 30,
      second: 0,
    });
  });

  it("reads the winter offset for the repeated Bucharest hour", () => {
    // arrange
    const instant = new Date("2026-10-25T01:30:00.000Z");

    // act
    const wallClock = instantToWallClock(instant, "Europe/Bucharest");

    // assert
    expect(wallClock).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 3,
      minute: 30,
      second: 0,
    });
  });

  it("reads a half-hour offset zone", () => {
    // arrange
    const instant = new Date("2026-06-15T11:30:00.000Z");

    // act
    const wallClock = instantToWallClock(instant, "Asia/Kolkata");

    // assert
    expect(wallClock).toEqual({
      year: 2026,
      month: 6,
      day: 15,
      hour: 17,
      minute: 0,
      second: 0,
    });
  });

  it("reads the previous day when the zone is behind UTC", () => {
    // arrange
    const instant = new Date("2026-06-15T02:00:00.000Z");

    // act
    const wallClock = instantToWallClock(instant, "America/New_York");

    // assert
    expect(wallClock).toEqual({
      year: 2026,
      month: 6,
      day: 14,
      hour: 22,
      minute: 0,
      second: 0,
    });
  });
});

describe("wallClockToInstant", () => {
  it.each([
    ["Europe/Bucharest", 2026, 3, 29, 0, "2026-03-28T22:00:00.000Z"],
    ["Europe/Bucharest", 2026, 3, 29, 17, "2026-03-29T14:00:00.000Z"],
    ["Europe/Bucharest", 2026, 10, 25, 0, "2026-10-24T21:00:00.000Z"],
    ["Europe/Bucharest", 2026, 10, 25, 17, "2026-10-25T15:00:00.000Z"],
    ["Europe/Bucharest", 2026, 10, 23, 17, "2026-10-23T14:00:00.000Z"],
    ["Asia/Kolkata", 2026, 6, 15, 17, "2026-06-15T11:30:00.000Z"],
    ["Asia/Kolkata", 2026, 12, 15, 17, "2026-12-15T11:30:00.000Z"],
  ])(
    "resolves %s %i-%i-%i at hour %i to %s",
    (timeZone, year, month, day, hour, expected) => {
      // arrange
      const wallClock = { timeZone, year, month, day, hour };

      // act
      const instant = wallClockToInstant(wallClock);

      // assert
      expect(instant.toISOString()).toBe(expected);
    },
  );

  it("resolves a wall clock hour the Bucharest spring change skips to the instant clocks jump to", () => {
    // arrange
    const skippedHour = {
      timeZone: "Europe/Bucharest",
      year: 2026,
      month: 3,
      day: 29,
      hour: 3,
    };

    // act
    const instant = wallClockToInstant(skippedHour);

    // assert
    expect(instant.toISOString()).toBe("2026-03-29T01:00:00.000Z");
  });

  it("round-trips every evening hour across the Bucharest autumn change", () => {
    // arrange
    const days = [23, 24, 25, 26];

    // act
    const roundTripped = days.map((day) =>
      instantToWallClock(
        wallClockToInstant({
          timeZone: "Europe/Bucharest",
          year: 2026,
          month: 10,
          day,
          hour: 17,
        }),
        "Europe/Bucharest",
      ),
    );

    // assert
    expect(roundTripped).toEqual(
      days.map((day) => ({
        year: 2026,
        month: 10,
        day,
        hour: 17,
        minute: 0,
        second: 0,
      })),
    );
  });
});

describe("addDays", () => {
  it.each([
    [{ year: 2026, month: 6, day: 1 }, 30, { year: 2026, month: 7, day: 1 }],
    [{ year: 2026, month: 2, day: 28 }, 1, { year: 2026, month: 3, day: 1 }],
    [{ year: 2026, month: 12, day: 31 }, 1, { year: 2027, month: 1, day: 1 }],
    [{ year: 2026, month: 10, day: 25 }, 0, { year: 2026, month: 10, day: 25 }],
  ])("adds %o plus %i days", (date, days, expected) => {
    // arrange
    const start = date;

    // act
    const shifted = addDays(start, days);

    // assert
    expect(shifted).toEqual(expected);
  });
});

describe("weekdayIndexOf", () => {
  it.each([
    [{ year: 2026, month: 6, day: 1 }, 1],
    [{ year: 2026, month: 6, day: 5 }, 5],
    [{ year: 2026, month: 6, day: 6 }, 6],
    [{ year: 2026, month: 10, day: 25 }, 0],
    [{ year: 2026, month: 3, day: 29 }, 0],
  ])("reads %o as weekday index %i", (date, expected) => {
    // arrange
    const calendarDate = date;

    // act
    const index = weekdayIndexOf(calendarDate);

    // assert
    expect(index).toBe(expected);
  });
});
