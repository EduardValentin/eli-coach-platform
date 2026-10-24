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
    const entry = { country: "RO", nationalNumber: "0712 345-678" };

    // act
    const phone = COUNTRIES.phoneOf(entry);

    // assert
    expect(phone).toEqual({ status: "valid", e164: "+40712345678" });
  });

  it("reads no phone from an empty number", () => {
    // arrange
    const entry = { country: "", nationalNumber: "  " };

    // act
    const phone = COUNTRIES.phoneOf(entry);

    // assert
    expect(phone).toEqual({ status: "empty" });
  });

  it.each([
    [
      "a country it does not know",
      { country: "ZZ", nationalNumber: "712345678" },
    ],
    ["letters", { country: "RO", nationalNumber: "07123abc" }],
    ["fewer than 4 digits", { country: "RO", nationalNumber: "123" }],
    [
      "more than 15 digits in all",
      { country: "MD", nationalNumber: "1234567890123" },
    ],
  ])("refuses a number with %s", (_label, entry) => {
    // arrange
    // act
    const phone = COUNTRIES.phoneOf(entry);

    // assert
    expect(phone).toEqual({ status: "invalid" });
  });
});
