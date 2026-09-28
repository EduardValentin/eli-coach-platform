import { measurementEntryOf, type MeasurementEntry } from "../measurement";
import type {
  OnboardingAnswersByForm,
  OnboardingFormAnswers,
} from "./onboarding-answers";

export const MEASUREMENT_FIELD_IDS = {
  weight: "weight",
  waist: "waist",
  hips: "hips",
  thigh: "thigh",
  arm: "arm",
} as const;

function numericAnswer(
  formAnswers: OnboardingFormAnswers,
  fieldId: string,
): number | undefined {
  const answer = formAnswers[fieldId];

  return typeof answer === "number" ? answer : undefined;
}

export function submittedMeasurementEntry(
  answers: OnboardingAnswersByForm,
  recordedAt: Date,
): MeasurementEntry | null {
  const measurements = answers.measurements;

  return measurementEntryOf(
    {
      weightKg: numericAnswer(
        answers["goal-availability"],
        MEASUREMENT_FIELD_IDS.weight,
      ),
      waistCm: numericAnswer(measurements, MEASUREMENT_FIELD_IDS.waist),
      hipsCm: numericAnswer(measurements, MEASUREMENT_FIELD_IDS.hips),
      thighCm: numericAnswer(measurements, MEASUREMENT_FIELD_IDS.thigh),
      armCm: numericAnswer(measurements, MEASUREMENT_FIELD_IDS.arm),
    },
    recordedAt,
  );
}
