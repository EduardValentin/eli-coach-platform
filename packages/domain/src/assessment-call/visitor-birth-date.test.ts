import { describe, expect, it } from "vitest";

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

describe("VisitorBirthDate#bookingProblemOn", () => {
  it("finds no problem for an adult of booking age", () => {
    // arrange
    const birthDate = VisitorBirthDate.parse("1994-03-14");

    // act
    const problem = birthDate?.bookingProblemOn(ON);

    // assert
    expect(problem).toBeNull();
  });

  it("counts her age on the day it is in her own time zone", () => {
    // arrange
    const turnsEighteenTomorrowInUtc = VisitorBirthDate.parse("2008-10-25");

    // act
    const problem = turnsEighteenTomorrowInUtc?.bookingProblemOn(ON);

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
    const problem = birthDate?.bookingProblemOn(ON);

    // assert
    expect(problem).toBe(expected);
  });
});
