import { describe, expect, it } from 'vitest';
import {
  cmToIn,
  displayLengthValue,
  formatCircumference,
  formatFeetAndInches,
  formatHeight,
  ftInToCm,
  inToCm,
  kgToLb,
  lbToKg,
  measurementSystemOf,
  MEASUREMENT_SYSTEM_LABELS,
} from './units';

describe('weight conversion', () => {
  it('keeps a pound reading to a tenth and a kilogram reading to a hundredth', () => {
    // arrange
    const typedPounds = 150;

    // act
    const canonical = lbToKg(typedPounds);

    // assert
    expect(canonical).toBe(68.04);
    expect(kgToLb(68)).toBe(149.9);
  });

  it('gives back the pounds she typed after a round trip', () => {
    // arrange
    const readings = [66, 120.5, 149.9, 150, 175.3, 220, 661];

    // act
    const roundTripped = readings.map((pounds) => kgToLb(lbToKg(pounds)));

    // assert
    expect(roundTripped).toEqual(readings);
  });
});

describe('length conversion', () => {
  it('keeps an inch reading to a quarter and a centimetre reading to a half', () => {
    // arrange
    const typedInches = 27;

    // act
    const canonical = inToCm(typedInches);

    // assert
    expect(canonical).toBe(68.5);
    expect(cmToIn(170)).toBe(67);
  });

  it('gives back the inches she typed after a round trip', () => {
    // arrange
    const readings = [15.75, 27, 29.25, 47, 66.25, 66.5, 90.75];

    // act
    const roundTripped = readings.map((inches) => cmToIn(inToCm(inches)));

    // assert
    expect(roundTripped).toEqual(readings);
  });

  it('leaves a centimetre reading alone when nothing is converted', () => {
    // arrange
    const typedCentimetres = 74.3;

    // act
    const shown = displayLengthValue(typedCentimetres, 'cm');

    // assert
    expect(shown).toBe(74.3);
    expect(formatCircumference(74, 'in')).toBe('29.25 in');
  });
});

describe('height display', () => {
  it('spells out feet and inches under an inches field', () => {
    // arrange
    const inches = 68;

    // act
    const spelled = formatFeetAndInches(inches);

    // assert
    expect(spelled).toBe('5 ft 8 in');
    expect(formatFeetAndInches(66.25)).toBe('5 ft 6 in');
  });

  it('converts feet and inches to canonical centimetres', () => {
    // arrange
    const feet = 5;

    // act
    const canonical = ftInToCm(feet, 8);

    // assert
    expect(canonical).toBe(172.5);
    expect(formatHeight(172.5, 'cm')).toBe('172.5 cm');
  });
});

describe('the measurement system', () => {
  it('reads the paired choice off the weight unit', () => {
    // arrange
    const labels = MEASUREMENT_SYSTEM_LABELS;

    // act
    const system = measurementSystemOf('lb');

    // assert
    expect(system).toBe('imperial');
    expect(measurementSystemOf('kg')).toBe('metric');
    expect(labels).toEqual({ metric: 'kg · cm', imperial: 'lb · in' });
  });
});
