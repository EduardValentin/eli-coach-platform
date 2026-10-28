import { describe, expect, it } from "vitest";

import { wallClockCalendarDates } from "~/bounded-contexts/scheduling/assessment-calls/public/wall-clock-calendar-dates";

import { VisitorBirthDate } from "./visitor-birth-date";

const ON = {
  on: new Date("2026-10-24T22:30:00.000Z"),
  timeZone: "Europe/Bucharest",
};

describe("VisitorBirthDate.parse", () => {
  it.each(["1994-02-30", "14/03/1994", "1994-3-14", ""])(
    "reads no birth date from %o",
    (isoDate) => {
      // arrange
      // act
      const birthDate = VisitorBirthDate.parse(isoDate);

      // assert
      expect(birthDate).toBeNull();
    },
  );
});

describe("VisitorBirthDate#ageOn", () => {
  it("counts whole years on the calendar date in her own zone", () => {
    // arrange
    const birthDate = VisitorBirthDate.parse("2008-10-25");

    // act
    const ages = [
      birthDate?.ageOn(ON, wallClockCalendarDates),
      birthDate?.ageOn({ on: ON.on, timeZone: "UTC" }, wallClockCalendarDates),
    ];

    // assert
    expect(ages).toEqual([18, 17]);
  });
});

describe("VisitorBirthDate#toSnapshot", () => {
  it("hands back the calendar date it was read from", () => {
    // arrange
    const birthDate = VisitorBirthDate.parse("1994-03-14");

    // act
    const snapshot = birthDate?.toSnapshot();

    // assert
    expect(snapshot).toEqual({ year: 1994, month: 3, day: 14 });
  });
});

describe("VisitorBirthDate#bookingProblemOn", () => {
  it("finds no problem for an adult of booking age", () => {
    // arrange
    const birthDate = VisitorBirthDate.parse("1994-03-14");

    // act
    const problem = birthDate?.bookingProblemOn(ON, wallClockCalendarDates);

    // assert
    expect(problem).toBeNull();
  });

  it("counts her age on the day it is in her own time zone", () => {
    // arrange
    const turnsEighteenTomorrowInUtc = VisitorBirthDate.parse("2008-10-25");

    // act
    const problem = turnsEighteenTomorrowInUtc?.bookingProblemOn(
      ON,
      wallClockCalendarDates,
    );

    // assert
    expect(problem).toBeNull();
  });

  it.each([
    ["a date in the future", "2030-01-01", "impossible"],
    ["a date over 120 years ago", "1900-01-01", "impossible"],
    ["someone under 18", "2010-06-01", "too-young"],
  ] as const)("names the problem with %s", (_label, isoDate, expected) => {
    // arrange
    const birthDate = VisitorBirthDate.parse(isoDate);

    // act
    const problem = birthDate?.bookingProblemOn(ON, wallClockCalendarDates);

    // assert
    expect(problem).toBe(expected);
  });
});
