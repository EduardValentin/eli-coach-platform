import { describe, expect, it } from "vitest";

import {
  ageOn,
  formatAgeForCard,
  formatAgeForEmail,
  labelForGender,
  labelForPrimaryGoal,
  MAX_BOOKING_AGE,
  MIN_BOOKING_AGE,
  normalizePhone,
  VISITOR_GENDER_OPTIONS,
  VISITOR_PRIMARY_GOAL_OPTIONS,
} from "./visitor-profile";

const BUCHAREST = "Europe/Bucharest";
const AUTUMN_EVENING = new Date("2026-09-21T18:00:00.000Z");

describe("visitor profile options", () => {
  it("labels the three genders in the order the visitor sees them", () => {
    // arrange
    const options = VISITOR_GENDER_OPTIONS;

    // act
    const labels = options.map((option) => option.label);

    // assert
    expect(options.map((option) => option.value)).toEqual([
      "female",
      "male",
      "prefer_not_to_say",
    ]);
    expect(labels).toEqual(["Female", "Male", "Prefer not to say"]);
  });

  it("labels the four primary goals in the order the visitor sees them", () => {
    // arrange
    const options = VISITOR_PRIMARY_GOAL_OPTIONS;

    // act
    const labels = options.map((option) => option.label);

    // assert
    expect(options.map((option) => option.value)).toEqual([
      "lose_weight",
      "build_muscle",
      "build_strength",
      "maintain_improve_lifestyle",
    ]);
    expect(labels).toEqual([
      "Lose weight",
      "Build muscle",
      "Build strength",
      "Maintain but improve lifestyle",
    ]);
  });

  it("names a stored gender and goal the way the visitor chose them", () => {
    // arrange
    const gender = "prefer_not_to_say";
    const goal = "maintain_improve_lifestyle";

    // act
    const genderLabel = labelForGender(gender);
    const goalLabel = labelForPrimaryGoal(goal);

    // assert
    expect(genderLabel).toBe("Prefer not to say");
    expect(goalLabel).toBe("Maintain but improve lifestyle");
  });

  it("books visitors between eighteen and one hundred and twenty", () => {
    // arrange, act
    const bounds = [MIN_BOOKING_AGE, MAX_BOOKING_AGE];

    // assert
    expect(bounds).toEqual([18, 120]);
  });
});

describe("normalizePhone", () => {
  it("stores nothing for a blank number", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "   " };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "empty" });
  });

  it("strips spaces, dots, dashes and parentheses", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "(712) 345.67-8" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "valid", e164: "+40712345678" });
  });

  it("drops one leading zero", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "0712 345 678" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "valid", e164: "+40712345678" });
  });

  it("drops only the first of two leading zeros", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "00712345678" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "valid", e164: "+400712345678" });
  });

  it("rejects letters and other symbols", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "0712 CALL ME" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("rejects a number shorter than four digits", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "0123" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("accepts four national digits", () => {
    // arrange
    const input = { callingCode: "+40", nationalNumber: "1234" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "valid", e164: "+401234" });
  });

  it("rejects a number longer than fourteen digits", () => {
    // arrange
    const input = { callingCode: "+1", nationalNumber: "123456789012345" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("rejects a number that would push the whole E.164 form past fifteen digits", () => {
    // arrange
    const input = { callingCode: "+358", nationalNumber: "1234567890123" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("accepts a number that fills the E.164 form exactly", () => {
    // arrange
    const input = { callingCode: "+358", nationalNumber: "123456789012" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "valid", e164: "+358123456789012" });
  });

  it("rejects a calling code that is not a plus and one to three digits", () => {
    // arrange
    const input = { callingCode: "40", nationalNumber: "712345678" };

    // act
    const result = normalizePhone(input);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });
});

describe("ageOn", () => {
  it("counts whole years on the calendar date in the visitor's zone", () => {
    // arrange
    const input = {
      dateOfBirth: "1994-03-14",
      on: AUTUMN_EVENING,
      timeZone: BUCHAREST,
    };

    // act
    const age = ageOn(input);

    // assert
    expect(age).toBe(32);
  });

  it("is a year short on the day before the birthday", () => {
    // arrange
    const input = {
      dateOfBirth: "1994-03-14",
      on: new Date("2026-03-13T12:00:00.000Z"),
      timeZone: BUCHAREST,
    };

    // act
    const age = ageOn(input);

    // assert
    expect(age).toBe(31);
  });

  it("turns a year older on the birthday itself", () => {
    // arrange
    const input = {
      dateOfBirth: "1994-03-14",
      on: new Date("2026-03-14T00:30:00.000Z"),
      timeZone: BUCHAREST,
    };

    // act
    const age = ageOn(input);

    // assert
    expect(age).toBe(32);
  });

  it("reads the birthday from the visitor's zone, not from UTC", () => {
    // arrange
    const lateEvening = new Date("2026-09-21T22:30:00.000Z");
    const eighteenthBirthday = "2008-09-22";

    // act
    const ageEastOfTheDateLine = ageOn({
      dateOfBirth: eighteenthBirthday,
      on: lateEvening,
      timeZone: "Pacific/Kiritimati",
    });
    const ageOnTheWestCoast = ageOn({
      dateOfBirth: eighteenthBirthday,
      on: lateEvening,
      timeZone: "America/Los_Angeles",
    });

    // assert
    expect(ageEastOfTheDateLine).toBe(18);
    expect(ageOnTheWestCoast).toBe(17);
  });

  it("is negative for a birth date still to come", () => {
    // arrange
    const input = {
      dateOfBirth: "2027-01-01",
      on: AUTUMN_EVENING,
      timeZone: BUCHAREST,
    };

    // act
    const age = ageOn(input);

    // assert
    expect(age).toBeLessThan(0);
  });
});

describe("formatAgeForCard", () => {
  it("shows the age with the short birth date", () => {
    // arrange
    const input = {
      dateOfBirth: "1994-03-14",
      on: AUTUMN_EVENING,
      timeZone: BUCHAREST,
    };

    // act
    const line = formatAgeForCard(input);

    // assert
    expect(line).toBe("32 (14 Mar 1994)");
  });

  it("abbreviates September to three letters", () => {
    // arrange
    const input = {
      dateOfBirth: "1990-09-05",
      on: AUTUMN_EVENING,
      timeZone: BUCHAREST,
    };

    // act
    const line = formatAgeForCard(input);

    // assert
    expect(line).toBe("36 (5 Sep 1990)");
  });
});

describe("formatAgeForEmail", () => {
  it("shows the age with the long birth date", () => {
    // arrange
    const input = {
      dateOfBirth: "1994-03-14",
      on: AUTUMN_EVENING,
      timeZone: BUCHAREST,
    };

    // act
    const line = formatAgeForEmail(input);

    // assert
    expect(line).toBe("32 (born 14 March 1994)");
  });
});
