import {
  fieldProblem,
  type OnboardingField,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasureUnits } from "@eli-coach-platform/domain/unit-preference";
import type { Validate } from "react-hook-form";

import {
  toAnswers,
  type OnboardingValue,
  type OnboardingValues,
} from "./onboarding-values";

type FieldValidationContext = {
  fields: readonly OnboardingField[];
  units: MeasureUnits;
};

export function validateField(
  field: OnboardingField,
  { fields, units }: FieldValidationContext,
): Validate<OnboardingValue, OnboardingValues> {
  return (_value, values) =>
    fieldProblem(field, toAnswers(fields, values, units), {
      today: new Date(),
      units,
    }) ?? true;
}
