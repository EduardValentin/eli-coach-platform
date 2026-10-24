import { describe, expect, it } from "vitest";

import {
  ClientIdentityEdit,
  type ClientIdentityEditInput,
} from "./client-identity-edit";

const ON = {
  on: new Date("2026-10-24T22:30:00.000Z"),
  timeZone: "Europe/Bucharest",
};

const ENTERED: ClientIdentityEditInput = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  phone: "+40712345678",
  dateOfBirth: "1994-03-14",
  country: "RO",
  gender: "female",
};

describe("ClientIdentityEdit.of", () => {
  it("holds her edited identity with her names trimmed", () => {
    // arrange
    const entered = { ...ENTERED, firstName: "  Ana ", lastName: " Popescu  " };

    // act
    const result = ClientIdentityEdit.of(entered, ON);

    // assert
    expect(result.status === "valid" && result.edit.toSnapshot()).toEqual(
      ENTERED,
    );
  });

  it("accepts an identity with no phone", () => {
    // arrange
    const entered = { ...ENTERED, phone: null };

    // act
    const result = ClientIdentityEdit.of(entered, ON);

    // assert
    expect(result.status).toBe("valid");
  });

  it("counts her age on the day it is in her own time zone", () => {
    // arrange
    const turnsEighteenTomorrowInUtc = {
      ...ENTERED,
      dateOfBirth: "2008-10-25",
    };

    // act
    const result = ClientIdentityEdit.of(turnsEighteenTomorrowInUtc, ON);

    // assert
    expect(result.status).toBe("valid");
  });

  it.each([
    ["a blank first name", { firstName: "  " }, { firstName: "missing" }],
    [
      "a last name over 60 characters",
      { lastName: "P".repeat(61) },
      { lastName: "too-long" },
    ],
    ["a phone outside E.164", { phone: "0712345678" }, { phone: "invalid" }],
    [
      "a phone with too many digits",
      { phone: "+4071234567890123" },
      { phone: "invalid" },
    ],
    [
      "a date of birth that is not a calendar date",
      { dateOfBirth: "1994-02-30" },
      { dateOfBirth: "impossible" },
    ],
    [
      "a date of birth in the future",
      { dateOfBirth: "2030-01-01" },
      { dateOfBirth: "impossible" },
    ],
    [
      "a date of birth over 120 years ago",
      { dateOfBirth: "1900-01-01" },
      { dateOfBirth: "impossible" },
    ],
    [
      "a client under 18",
      { dateOfBirth: "2010-06-01" },
      { dateOfBirth: "too-young" },
    ],
    [
      "a country that is not a code",
      { country: "Romania" },
      { country: "invalid" },
    ],
  ] as const)("names the problem with %s", (_label, change, problems) => {
    // arrange
    const entered = { ...ENTERED, ...change };

    // act
    const result = ClientIdentityEdit.of(entered, ON);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });
});
