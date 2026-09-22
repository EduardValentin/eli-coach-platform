import { describe, expect, it } from 'vitest';
import { COUNTRIES, findCountry } from './countries';

describe('countries', () => {
  it('lists every country once, sorted by name, with a calling code each', () => {
    // arrange
    const codes = COUNTRIES.map((country) => country.code);
    const names = COUNTRIES.map((country) => country.name);

    // act
    const sorted = [...names].sort((left, right) => left.localeCompare(right, 'en'));

    // assert
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect(COUNTRIES.every((country) => /^\+\d{1,3}$/.test(country.callingCode))).toBe(true);
    expect(names).toEqual(sorted);
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(240);
  });

  it('finds a country by its ISO code', () => {
    // arrange
    // act
    const romania = findCountry('RO');

    // assert
    expect(romania).toEqual({ code: 'RO', name: 'Romania', callingCode: '+40' });
    expect(findCountry('ZZ')).toBeUndefined();
  });
});
