import type {
  OnboardingField,
  OnboardingFormAnswers,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import { describe, expect, it } from "vitest";

import {
  toAnswers,
  toFormValues,
  visibleFields,
  type OnboardingValues,
} from "./onboarding-values";

const METRIC: MeasureUnits = { weight: "kg", length: "cm" };

const IMPERIAL: MeasureUnits = { weight: "lb", length: "in" };

const TRIGGER_FIELD: OnboardingField = {
  id: "trigger",
  label: "Trigger",
  kind: "radio",
  requirement: "required",
};

const REVEALED_FIELD: OnboardingField = {
  id: "detail",
  label: "Detail",
  kind: "text",
  requirement: "optional",
  revealedBy: { id: "trigger", value: "yes" },
};

const LENGTH_UNKNOWN_FIELD: OnboardingField = {
  id: "lengthUnknown",
  label: "I'm not sure",
  kind: "checkbox",
  requirement: "optional",
};

const CONCEALED_FIELD: OnboardingField = {
  id: "length",
  label: "Length",
  kind: "number",
  requirement: "optional",
  concealedBy: { id: "lengthUnknown", value: "true" },
};

const CONTRACEPTION_FIELD: OnboardingField = {
  id: "contraception",
  label: "Contraception",
  kind: "select",
  requirement: "required",
};

const LIFE_STAGE_FIELD: OnboardingField = {
  id: "lifeStage",
  label: "Life stage",
  kind: "chips",
  requirement: "required",
};

const REQUIRES_FIELD: OnboardingField = {
  id: "refinement",
  label: "Refinement",
  kind: "text",
  requirement: "optional",
  requires: ["contraception", "lifeStage"],
};

const WEIGHT_FIELD: OnboardingField = {
  id: "weight",
  label: "Your weight",
  kind: "weight",
  requirement: "required",
};

const HEIGHT_FIELD: OnboardingField = {
  id: "height",
  label: "Your height",
  kind: "height",
  requirement: "required",
};

describe("visibleFields", () => {
  it("hides a field once its concealedBy condition matches", () => {
    // arrange
    const fields = [LENGTH_UNKNOWN_FIELD, CONCEALED_FIELD];

    // act
    const hidden = visibleFields(fields, { lengthUnknown: "true" }, METRIC);
    const shown = visibleFields(fields, { lengthUnknown: "false" }, METRIC);

    // assert
    expect(hidden).toEqual([LENGTH_UNKNOWN_FIELD]);
    expect(shown).toEqual([LENGTH_UNKNOWN_FIELD, CONCEALED_FIELD]);
  });

  it("keeps a revealedBy field hidden until its condition matches", () => {
    // arrange
    const fields = [TRIGGER_FIELD, REVEALED_FIELD];

    // act
    const hidden = visibleFields(fields, { trigger: "no" }, METRIC);
    const shown = visibleFields(fields, { trigger: "yes" }, METRIC);

    // assert
    expect(hidden).toEqual([TRIGGER_FIELD]);
    expect(shown).toEqual([TRIGGER_FIELD, REVEALED_FIELD]);
  });

  it("hides a field with requires until every listed field is answered", () => {
    // arrange
    const fields = [CONTRACEPTION_FIELD, LIFE_STAGE_FIELD, REQUIRES_FIELD];

    // act
    const noneAnswered = visibleFields(fields, {}, METRIC);
    const partlyAnswered = visibleFields(
      fields,
      { contraception: "None" },
      METRIC,
    );
    const fullyAnswered = visibleFields(
      fields,
      { contraception: "None", lifeStage: ["None of these"] },
      METRIC,
    );

    // assert
    expect(noneAnswered).not.toContain(REQUIRES_FIELD);
    expect(partlyAnswered).not.toContain(REQUIRES_FIELD);
    expect(fullyAnswered).toContain(REQUIRES_FIELD);
  });

  it("never lands a value for a field that is not currently visible", () => {
    // arrange
    const fields = [TRIGGER_FIELD, LENGTH_UNKNOWN_FIELD, CONCEALED_FIELD];
    const values: OnboardingValues = {
      trigger: "yes",
      lengthUnknown: "true",
      length: "28",
    };

    // act
    const shown = visibleFields(fields, values, METRIC);
    const answers = toAnswers(shown, values, METRIC);

    // assert
    expect(answers).not.toHaveProperty("length");
  });
});

describe("toAnswers", () => {
  it("stores what she typed in pounds and inches as kilograms and centimetres", () => {
    // arrange
    const values: OnboardingValues = { weight: "150", height: "65" };

    // act
    const answers = toAnswers([WEIGHT_FIELD, HEIGHT_FIELD], values, IMPERIAL);

    // assert
    expect(answers).toEqual({ weight: 68.04, height: 165 });
  });

  it("leaves out what she has not answered and keeps an unticked box", () => {
    // arrange
    const values: OnboardingValues = {
      contraception: "",
      lifeStage: [],
      lengthUnknown: "false",
    };

    // act
    const answers = toAnswers(
      [CONTRACEPTION_FIELD, LIFE_STAGE_FIELD, LENGTH_UNKNOWN_FIELD],
      values,
      METRIC,
    );

    // assert
    expect(answers).toEqual({ lengthUnknown: false });
  });
});

describe("toFormValues", () => {
  it("shows a stored weight and height in her units", () => {
    // arrange
    const answers: OnboardingFormAnswers = { weight: 66.1, height: 165 };

    // act
    const values = toFormValues(
      [WEIGHT_FIELD, HEIGHT_FIELD],
      answers,
      IMPERIAL,
    );

    // assert
    expect(values).toEqual({ weight: "145.7", height: "65" });
  });

  it("gives every field an empty value until she answers it", () => {
    // arrange
    const fields = [TRIGGER_FIELD, LIFE_STAGE_FIELD, LENGTH_UNKNOWN_FIELD];

    // act
    const values = toFormValues(fields, {}, METRIC);

    // assert
    expect(values).toEqual({
      trigger: "",
      lifeStage: [],
      lengthUnknown: "false",
    });
  });
});
