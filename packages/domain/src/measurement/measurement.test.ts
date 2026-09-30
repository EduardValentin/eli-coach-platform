import { describe, expect, it } from "vitest";

import {
  earliestMeasurementOf,
  latestMeasurementOf,
  measurementEntryOf,
} from "./measurement";

const RECORDED_AT = new Date("2026-09-21T08:00:00.000Z");

describe("measurementEntryOf", () => {
  it("holds every reading she gave, in kilograms and centimetres", () => {
    // arrange
    const values = {
      weightKg: 68.04,
      waistCm: 68.5,
      hipsCm: 99,
      thighCm: 57,
      armCm: 28,
    };

    // act
    const entry = measurementEntryOf(values, RECORDED_AT);

    // assert
    expect(entry).toEqual({
      recordedAt: RECORDED_AT,
      weightKg: 68.04,
      waistCm: 68.5,
      hipsCm: 99,
      thighCm: 57,
      armCm: 28,
    });
  });

  it("leaves an optional reading out entirely when she did not give it", () => {
    // arrange
    const values = { weightKg: 66.1, waistCm: 74 };

    // act
    const entry = measurementEntryOf(values, RECORDED_AT);

    // assert
    expect(entry).toEqual({
      recordedAt: RECORDED_AT,
      weightKg: 66.1,
      waistCm: 74,
    });
    expect(Object.hasOwn(entry ?? {}, "hipsCm")).toBe(false);
    expect(Object.hasOwn(entry ?? {}, "thighCm")).toBe(false);
    expect(Object.hasOwn(entry ?? {}, "armCm")).toBe(false);
  });

  it("is null when the weight is missing", () => {
    // arrange
    const values = { waistCm: 74 };

    // act
    const entry = measurementEntryOf(values, RECORDED_AT);

    // assert
    expect(entry).toBeNull();
  });

  it("is null when the waist is missing", () => {
    // arrange
    const values = { weightKg: 66.1 };

    // act
    const entry = measurementEntryOf(values, RECORDED_AT);

    // assert
    expect(entry).toBeNull();
  });
});

describe("latestMeasurementOf", () => {
  it("picks the entry recorded last, whatever the order it is given in", () => {
    // arrange
    const first = { recordedAt: RECORDED_AT, weightKg: 70, waistCm: 74 };
    const latest = {
      recordedAt: new Date("2026-09-28T08:00:00.000Z"),
      weightKg: 68.5,
      waistCm: 72,
    };
    const between = {
      recordedAt: new Date("2026-09-24T08:00:00.000Z"),
      weightKg: 69,
      waistCm: 73,
    };

    // act
    const picked = latestMeasurementOf([first, latest, between]);

    // assert
    expect(picked).toBe(latest);
  });

  it("answers nothing when she has no measurement", () => {
    // arrange, act
    const picked = latestMeasurementOf([]);

    // assert
    expect(picked).toBeNull();
  });
});

describe("earliestMeasurementOf", () => {
  it("picks the entry recorded first, whatever the order it is given in", () => {
    // arrange
    const earliest = { recordedAt: RECORDED_AT, weightKg: 70, waistCm: 74 };
    const later = {
      recordedAt: new Date("2026-09-28T08:00:00.000Z"),
      weightKg: 68.5,
      waistCm: 72,
    };

    // act
    const picked = earliestMeasurementOf([later, earliest]);

    // assert
    expect(picked).toBe(earliest);
  });

  it("answers nothing when she has no measurement", () => {
    // arrange, act
    const picked = earliestMeasurementOf([]);

    // assert
    expect(picked).toBeNull();
  });
});
