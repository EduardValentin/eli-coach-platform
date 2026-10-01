import {
  PROGRESS_PHOTO_VIEWS,
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

export type SentMeasurementEntry = {
  recordedAt: Date;
  photos: ProgressPhotoSet;
};

export function submittedMeasurementEntry(
  answers: Record<OnboardingFormId, OnboardingFormAnswers>,
  sent: SentMeasurementEntry,
): MeasurementEntry | null {
  return measurementEntryFrom(
    {
      ...answers.measurements,
      [MEASUREMENT_FIELD_IDS.weight]: answers['goal-availability'].weight,
    },
    sent.recordedAt,
    sent.photos,
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

export function progressPhotoRefusalMessage(
  view: ProgressPhotoView,
): string {
  return `The ${view} photo could not be processed, so it was not saved.`;
}

export function storedPhotoViews(entry: MeasurementEntry): ProgressPhotoView[] {
  return PROGRESS_PHOTO_VIEWS.filter((view) => entry.photos[view]);
}

function storedPhotoViewAfter(
  entry: MeasurementEntry,
  view: ProgressPhotoView,
  step: 1 | -1,
): ProgressPhotoView {
  const views = storedPhotoViews(entry);
  const position = views.indexOf(view);

  return views[(position + step + views.length) % views.length] ?? view;
}

export function nextStoredPhotoView(
  entry: MeasurementEntry,
  view: ProgressPhotoView,
): ProgressPhotoView {
  return storedPhotoViewAfter(entry, view, 1);
}

export function previousStoredPhotoView(
  entry: MeasurementEntry,
  view: ProgressPhotoView,
): ProgressPhotoView {
  return storedPhotoViewAfter(entry, view, -1);
}
