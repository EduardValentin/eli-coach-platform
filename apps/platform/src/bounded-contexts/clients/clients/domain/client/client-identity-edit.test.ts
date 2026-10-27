import { describe, expect, it } from "vitest";

import { VisitorCountries } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

import {
  ClientIdentityEdit,
  type ClientIdentityEditSnapshot,
  type EnteredClientIdentity,
} from "./client-identity-edit";

const ON = {
  on: new Date("2026-10-24T22:30:00.000Z"),
  timeZone: "Europe/Bucharest",
};

const COUNTRIES = VisitorCountries.of([
  { code: "RO", callingCode: "+40" },
  { code: "MD", callingCode: "+373" },
]);

const ENTERED: EnteredClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  phone: { country: "RO", nationalNumber: "0712 345 678" },
  dateOfBirth: "1994-03-14",
  country: "RO",
  gender: "female",
};

const SAVED: ClientIdentityEditSnapshot = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  phone: "+40712345678",
  dateOfBirth: "1994-03-14",
  country: "RO",
  gender: "female",
};

describe("ClientIdentityEdit.of", () => {
  it("holds her edited identity with her names trimmed and her phone in E.164", () => {
    // arrange
    const entered = { ...ENTERED, firstName: "  Ana ", lastName: " Popescu  " };

    // act
    const result = ClientIdentityEdit.of(entered, ON, COUNTRIES);

    // assert
    expect(result.status === "valid" && result.edit.toSnapshot()).toEqual(
      SAVED,
    );
  });

  it("holds no phone when she leaves the number empty", () => {
    // arrange
    const entered = { ...ENTERED, phone: { country: "", nationalNumber: "" } };

    // act
    const result = ClientIdentityEdit.of(entered, ON, COUNTRIES);

    // assert
    expect(result.status === "valid" && result.edit.toSnapshot()).toEqual({
      ...SAVED,
      phone: null,
    });
  });

  it("counts her age on the day it is in her own time zone", () => {
    // arrange
    const turnsEighteenTomorrowInUtc = {
      ...ENTERED,
      dateOfBirth: "2008-10-25",
    };

    // act
    const result = ClientIdentityEdit.of(
      turnsEighteenTomorrowInUtc,
      ON,
      COUNTRIES,
    );

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
    [
      "a phone number with too few digits",
      { phone: { country: "RO", nationalNumber: "12" } },
      { phone: "invalid" },
    ],
    [
      "a phone under a country it does not know",
      { phone: { country: "ZZ", nationalNumber: "712345678" } },
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
      "a client under 18",
      { dateOfBirth: "2010-06-01" },
      { dateOfBirth: "too-young" },
    ],
    ["a country it does not know", { country: "ZZ" }, { country: "invalid" }],
  ] as const)("names the problem with %s", (_label, change, problems) => {
    // arrange
    const entered = { ...ENTERED, ...change };

    // act
    const result = ClientIdentityEdit.of(entered, ON, COUNTRIES);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });

  it("names every problem of one entry at once", () => {
    // arrange
    const entered = {
      ...ENTERED,
      firstName: " ",
      dateOfBirth: "2015-01-01",
      phone: { country: "RO", nationalNumber: "12" },
      country: "ZZ",
    };

    // act
    const result = ClientIdentityEdit.of(entered, ON, COUNTRIES);

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: {
        firstName: "missing",
        dateOfBirth: "too-young",
        phone: "invalid",
        country: "invalid",
      },
    });
  });
});
