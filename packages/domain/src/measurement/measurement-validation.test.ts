import { describe, expect, it } from "vitest";

import type { MeasureUnits } from "../unit-preference";
import {
  MEASUREMENT_FIELDS,
  type MeasurementField,
} from "./measurement-fields";
import {
  hasMeasurementProblem,
  measurementProblem,
} from "./measurement-validation";

const METRIC: MeasureUnits = { weight: "kg", length: "cm" };
const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };

function fieldWithId(id: MeasurementField["id"]): MeasurementField {
  const field = MEASUREMENT_FIELDS.find((candidate) => candidate.id === id);
  if (!field) throw new Error(`No measurement field ${id}`);

  return field;
}

describe("measurementProblem, missing readings", () => {
  it("asks for a weight when she leaves it out", () => {
    // arrange
    const field = fieldWithId("weight");

    // act
    const problem = measurementProblem(field, undefined, METRIC);

    // assert
    expect(problem).toBe("Enter a weight.");
  });

  it("asks for a measurement when she leaves the waist out", () => {
    // arrange
    const field = fieldWithId("waist");

    // act
    const problem = measurementProblem(field, null, METRIC);

    // assert
    expect(problem).toBe("Enter a measurement.");
  });

  it("lets her skip an optional reading", () => {
    // arrange
    const field = fieldWithId("hips");

    // act
    const problem = measurementProblem(field, undefined, METRIC);

    // assert
    expect(problem).toBeNull();
  });

  it("asks for a number when an optional reading is not one", () => {
    // arrange
    const field = fieldWithId("thigh");

    // act
    const problem = measurementProblem(field, "fifty", METRIC);

    // assert
    expect(problem).toBe("Enter a measurement.");
  });
});

describe("measurementProblem, ranges in her units", () => {
  it("reports the kilogram bounds for a weight outside them", () => {
    // arrange
    const field = fieldWithId("weight");

    // act
    const problem = measurementProblem(field, 25, METRIC);

    // assert
    expect(problem).toBe("Enter a weight between 30 and 300 kg.");
  });

  it("converts the weight bounds to pounds", () => {
    // arrange
    const field = fieldWithId("weight");

    // act
    const problem = measurementProblem(field, 25, IMPERIAL);

    // assert
    expect(problem).toBe("Enter a weight between 66 and 661 lb.");
  });

  it("converts a circumference's bounds to inches", () => {
    // arrange
    const field = fieldWithId("arm");

    // act
    const problem = measurementProblem(field, 70, IMPERIAL);

    // assert
    expect(problem).toBe("Enter a measurement between 6 and 24 in.");
  });

  it("passes a reading inside the range", () => {
    // arrange
    const field = fieldWithId("waist");

    // act
    const problem = measurementProblem(field, 72, METRIC);

    // assert
    expect(problem).toBeNull();
  });
});

describe("measurementProblem, readings that are not numbers", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "asks for a weight when the reading is %s",
    (reading) => {
      // arrange
      const field = fieldWithId("weight");

      // act
      const problem = measurementProblem(field, reading, METRIC);

      // assert
      expect(problem).toBe("Enter a weight.");
    },
  );
});

describe("hasMeasurementProblem", () => {
  it("passes kilograms and centimetres inside every range", () => {
    // arrange
    const values = {
      weightKg: 68,
      waistCm: 72,
      hipsCm: 98,
      thighCm: 55,
      armCm: 28,
    };

    // act
    const problem = hasMeasurementProblem(values);

    // assert
    expect(problem).toBe(false);
  });

  it("passes when she skips the optional readings", () => {
    // arrange
    const values = { weightKg: 68, waistCm: 72 };

    // act
    const problem = hasMeasurementProblem(values);

    // assert
    expect(problem).toBe(false);
  });

  it.each([
    ["a missing waist", { weightKg: 68 }],
    ["a weight under 30 kg", { weightKg: 20, waistCm: 72 }],
    ["an arm over 60 cm", { weightKg: 68, waistCm: 72, armCm: 61 }],
  ])("finds a problem with %s", (_problem, values) => {
    // arrange, act
    const problem = hasMeasurementProblem(values);

    // assert
    expect(problem).toBe(true);
  });
});
