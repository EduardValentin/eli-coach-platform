import { describe, expect, it } from "vitest";

import { emptyAnswers } from "./onboarding-answers";
import { submittedMeasurementEntry } from "./onboarding-measurements";

const RECORDED_AT = new Date("2026-09-21T08:00:00.000Z");

describe("submittedMeasurementEntry", () => {
  it("takes the weight from the goal form and the rest from the measurements form", () => {
    // arrange
    const answers = emptyAnswers();
    answers["goal-availability"] = { weight: 68.04 };
    answers.measurements = { waist: 68.5, hips: 99, thigh: 57, arm: 28 };

    // act
    const entry = submittedMeasurementEntry(answers, RECORDED_AT);

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

  it("is null while the weight or the waist has not been answered", () => {
    // arrange
    const answers = emptyAnswers();
    answers.measurements = { waist: 68.5 };

    // act
    const entry = submittedMeasurementEntry(answers, RECORDED_AT);

    // assert
    expect(entry).toBeNull();
  });
});
