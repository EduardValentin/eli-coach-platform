import { measurementEntryOf, type MeasurementEntry } from "../measurement";
import type { OnboardingAnswersByForm } from "./onboarding-answers";

export const MEASUREMENT_FIELD_IDS = {
  weight: "weight",
  waist: "waist",
  hips: "hips",
  thigh: "thigh",
  arm: "arm",
} as const;

function reading(
  answers: OnboardingAnswersByForm[keyof OnboardingAnswersByForm],
  key: string,
): number | undefined {
  const answer = answers[key];

  return typeof answer === "number" ? answer : undefined;
}

export function submittedMeasurementEntry(
  answers: OnboardingAnswersByForm,
  recordedAt: Date,
): MeasurementEntry | null {
  const measurements = answers.measurements;

  return measurementEntryOf(
    {
      weightKg: reading(
        answers["goal-availability"],
        MEASUREMENT_FIELD_IDS.weight,
      ),
      waistCm: reading(measurements, MEASUREMENT_FIELD_IDS.waist),
      hipsCm: reading(measurements, MEASUREMENT_FIELD_IDS.hips),
      thighCm: reading(measurements, MEASUREMENT_FIELD_IDS.thigh),
      armCm: reading(measurements, MEASUREMENT_FIELD_IDS.arm),
    },
    recordedAt,
  );
}
