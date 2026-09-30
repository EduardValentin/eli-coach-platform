import {
  NO_PROGRESS_PHOTOS,
  withoutPhotoAt,
  type MeasurementEntry,
  type OnboardingFormAnswers,
  type OnboardingFormId,
  type ProgressPhotoSet,
  type ProgressPhotoView,
} from './journey';

export const PROGRESS_PHOTO_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const PROGRESS_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function isAcceptedProgressPhoto(file: Pick<File, 'type' | 'size'>): boolean {
  return (
    PROGRESS_PHOTO_TYPES.includes(file.type) &&
    file.size <= PROGRESS_PHOTO_MAX_BYTES
  );
}

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
  photos: ProgressPhotoSet,
): MeasurementEntry | null {
  const weightKg = reading(answers, MEASUREMENT_FIELD_IDS.weight);
  const waistCm = reading(answers, MEASUREMENT_FIELD_IDS.waist);

  if (weightKg === undefined || waistCm === undefined) return null;

  return {
    id: crypto.randomUUID(),
    recordedAt,
    weightKg,
    waistCm,
    hipsCm: reading(answers, MEASUREMENT_FIELD_IDS.hips),
    thighCm: reading(answers, MEASUREMENT_FIELD_IDS.thigh),
    armCm: reading(answers, MEASUREMENT_FIELD_IDS.arm),
    photos,
  };
}

export function submittedMeasurementEntry(
  answers: Record<OnboardingFormId, OnboardingFormAnswers>,
  recordedAt: Date,
): MeasurementEntry | null {
  return measurementEntryFrom(
    {
      ...answers.measurements,
      [MEASUREMENT_FIELD_IDS.weight]: answers['goal-availability'].weight,
    },
    recordedAt,
    NO_PROGRESS_PHOTOS,
  );
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

export function withoutProgressPhoto(
  entry: MeasurementEntry,
  view: ProgressPhotoView,
): MeasurementEntry {
  return { ...entry, photos: withoutPhotoAt(entry.photos, view) };
}
