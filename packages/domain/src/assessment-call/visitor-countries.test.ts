import { describe, expect, it } from "vitest";

import { VisitorCountries } from "./visitor-countries";

const COUNTRIES = VisitorCountries.of([
  { code: "RO", callingCode: "+40" },
  { code: "MD", callingCode: "+373" },
]);

describe("VisitorCountries#includes", () => {
  it("knows the countries it was given and no other", () => {
    // arrange
    const codes = ["RO", "MD", "ZZ", "ro"];

    // act
    const known = codes.map((code) => COUNTRIES.includes(code));

    // assert
    expect(known).toEqual([true, true, false, false]);
  });
});

describe("VisitorCountries#phoneOf", () => {
  it("reads a national number in E.164 under its country's calling code", () => {
    // arrange
    const entry = { country: "MD", nationalNumber: "068 123 456" };

    // act
    const reading = COUNTRIES.phoneOf(entry);

    // assert
    expect(reading.status === "valid" && reading.phone.toSnapshot()).toEqual({
      e164: "+37368123456",
    });
  });

  it("reads no phone from an empty number", () => {
    // arrange
    const entry = { country: "", nationalNumber: "  " };

    // act
    const reading = COUNTRIES.phoneOf(entry);

    // assert
    expect(reading).toEqual({ status: "empty" });
  });

  it("refuses a number under a country it does not know", () => {
    // arrange
    const entry = { country: "ZZ", nationalNumber: "712345678" };

    // act
    const reading = COUNTRIES.phoneOf(entry);

    // assert
    expect(reading).toEqual({ status: "invalid" });
  });
});
