import { describe, expect, it } from "vitest";

import { COUNTRIES, findCountry } from "./countries";

describe("COUNTRIES", () => {
  it("lists every country once by its alpha-2 code", () => {
    // arrange
    const codes = COUNTRIES.map((country) => country.code);

    // act
    const uniqueCodes = new Set(codes);

    // assert
    expect(uniqueCodes.size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });

  it("gives every country a calling code of one to three digits after the plus", () => {
    // arrange
    const callingCodes = COUNTRIES.map((country) => country.callingCode);

    // act
    const wellFormed = callingCodes.filter((code) => /^\+\d{1,3}$/.test(code));

    // assert
    expect(wellFormed).toHaveLength(callingCodes.length);
  });

  it("sorts the countries by English name", () => {
    // arrange
    const names = COUNTRIES.map((country) => country.name);

    // act
    const sorted = [...names].sort((left, right) =>
      left.localeCompare(right, "en"),
    );

    // assert
    expect(names).toEqual(sorted);
  });

  it("covers the whole ISO 3166-1 list", () => {
    // arrange
    const lower = 230;
    const upper = 250;

    // act
    const count = COUNTRIES.length;

    // assert
    expect(count).toBeGreaterThanOrEqual(lower);
    expect(count).toBeLessThanOrEqual(upper);
  });
});

describe("findCountry", () => {
  it("finds Romania with its calling code", () => {
    // arrange
    const code = "RO";

    // act
    const country = findCountry(code);

    // assert
    expect(country).toEqual({
      code: "RO",
      name: "Romania",
      callingCode: "+40",
    });
  });

  it("finds nothing for a code that is not a country", () => {
    // arrange
    const code = "XX";

    // act
    const country = findCountry(code);

    // assert
    expect(country).toBeUndefined();
  });
});
