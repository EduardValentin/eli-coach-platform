import { describe, expect, it } from "vitest";

import { MEASUREMENT_FIELDS } from "./measurement-fields";

describe("MEASUREMENT_FIELDS", () => {
  it("asks weight and waist first, then the optional hips, thigh and arm", () => {
    // arrange, act
    const fields = MEASUREMENT_FIELDS.map((field) => [
      field.id,
      field.label,
      field.kind,
      field.requirement,
    ]);

    // assert
    expect(fields).toEqual([
      ["weight", "Weight", "weight", "required"],
      ["waist", "Waist", "circumference", "required"],
      ["hips", "Hips", "circumference", "optional"],
      ["thigh", "Thigh", "circumference", "optional"],
      ["arm", "Arm", "circumference", "optional"],
    ]);
  });

  it("tells her how to take each reading so they stay comparable", () => {
    // arrange, act
    const hints = MEASUREMENT_FIELDS.map((field) => field.hint);

    // assert
    expect(hints).toEqual([
      "First thing in the morning, before eating, after the bathroom.",
      "Narrowest point, usually just above the belly button. Relaxed, don't pull the tape tight.",
      "Widest point.",
      "Mid-thigh, same leg every time.",
      "Relaxed, mid-bicep.",
    ]);
  });

  it("bounds each reading in kilograms or centimetres", () => {
    // arrange, act
    const ranges = MEASUREMENT_FIELDS.map((field) => field.range);

    // assert
    expect(ranges).toEqual([
      { min: 30, max: 300 },
      { min: 40, max: 200 },
      { min: 50, max: 200 },
      { min: 30, max: 100 },
      { min: 15, max: 60 },
    ]);
  });
});
