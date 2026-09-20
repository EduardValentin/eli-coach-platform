import type { MeasurementEntry, OnboardingFormAnswers } from './journey';

export const MEASUREMENT_FIELD_IDS = {
  weight: 'weight',
  waist: 'waist',
  hips: 'hips',
  thigh: 'thigh',
  arm: 'arm',
} as const;

function reading(answers: OnboardingFormAnswers, key: string): number | undefined {
  const answer = answers[key];

  return typeof answer === 'number' ? answer : undefined;
}

export function measurementEntryFrom(
  answers: OnboardingFormAnswers,
  recordedAt: Date,
): MeasurementEntry | null {
  const weightKg = reading(answers, MEASUREMENT_FIELD_IDS.weight);
  const waistCm = reading(answers, MEASUREMENT_FIELD_IDS.waist);

  if (weightKg === undefined || waistCm === undefined) return null;

  return {
    recordedAt,
    weightKg,
    waistCm,
    hipsCm: reading(answers, MEASUREMENT_FIELD_IDS.hips),
    thighCm: reading(answers, MEASUREMENT_FIELD_IDS.thigh),
    armCm: reading(answers, MEASUREMENT_FIELD_IDS.arm),
  };
}

export function measurementAnswersFrom(
  entry: MeasurementEntry | undefined,
): OnboardingFormAnswers {
  if (!entry) return {};

  const answers: OnboardingFormAnswers = {
    [MEASUREMENT_FIELD_IDS.weight]: entry.weightKg,
    [MEASUREMENT_FIELD_IDS.waist]: entry.waistCm,
  };

  if (entry.hipsCm !== undefined) answers[MEASUREMENT_FIELD_IDS.hips] = entry.hipsCm;
  if (entry.thighCm !== undefined) answers[MEASUREMENT_FIELD_IDS.thigh] = entry.thighCm;
  if (entry.armCm !== undefined) answers[MEASUREMENT_FIELD_IDS.arm] = entry.armCm;

  return answers;
}
