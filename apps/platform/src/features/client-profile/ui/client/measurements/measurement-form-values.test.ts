import { describe, expect, it } from "vitest";

import type { MeasurementRow } from "~/features/client-profile/public/measurements";

import {
  measurementEntryOf,
  measurementFormValuesOf,
} from "./measurement-form-values";

const IMPERIAL = { weight: "lb", length: "in" } as const;

const LATEST: MeasurementRow = {
  id: "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
  recordedAt: "2026-09-29T08:00:00.000Z",
  weightKg: 66.1,
  waistCm: 74,
  hipsCm: null,
  thighCm: 55,
  armCm: null,
  photos: [],
};

describe("measurement form values", () => {
  it("shows her latest readings in her units and leaves the skipped ones empty", () => {
    // arrange, act
    const values = measurementFormValuesOf(LATEST, IMPERIAL);

    // assert
    expect(values).toEqual({
      weight: "145.7",
      waist: "29.25",
      hips: "",
      thigh: "21.75",
      arm: "",
    });
  });

  it("starts empty when she has no readings yet", () => {
    // arrange, act
    const values = measurementFormValuesOf(undefined, IMPERIAL);

    // assert
    expect(values).toEqual({
      weight: "",
      waist: "",
      hips: "",
      thigh: "",
      arm: "",
    });
  });

  it("turns her readings into kilograms and centimetres and leaves out what she skipped", () => {
    // arrange
    const values = {
      weight: "145.7",
      waist: " 29.25 ",
      hips: "",
      thigh: "21.75",
      arm: "",
    };

    // act
    const entry = measurementEntryOf(values, IMPERIAL);

    // assert
    expect(entry).toEqual({ weightKg: 66.09, waistCm: 74.5, thighCm: 55 });
  });
});
