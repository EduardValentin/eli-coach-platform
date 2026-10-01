import {
  NO_PROGRESS_PHOTOS,
  PROGRESS_PHOTO_VIEWS,
  type MeasurementEntry,
  type ProgressPhotoView,
} from '../domain/journey';

export type PhotoProcessing = 'works' | 'refuses';

export const PHOTO_PROCESSING_OUTCOMES: readonly PhotoProcessing[] = [
  'works',
  'refuses',
];

export type MeasurementSave = 'works' | 'fails';

export const MEASUREMENT_SAVE_OUTCOMES: readonly MeasurementSave[] = [
  'works',
  'fails',
];

export type PhotoRemoval = 'works' | 'fails';

export const PHOTO_REMOVAL_OUTCOMES: readonly PhotoRemoval[] = [
  'works',
  'fails',
];

export type MeasurementOutcomes = {
  processing: PhotoProcessing;
  save: MeasurementSave;
};

export const SIMULATED_LATENCY_MS = 900;

export type RecordedMeasurements = {
  entry: MeasurementEntry;
  refusedViews: ProgressPhotoView[];
};

export async function recordMeasurements(
  entry: MeasurementEntry,
  outcomes: MeasurementOutcomes,
): Promise<RecordedMeasurements> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcomes.save === 'fails') {
    throw new Error('The measurements could not be saved.');
  }

  if (outcomes.processing === 'works') return { entry, refusedViews: [] };

  return {
    entry: { ...entry, photos: NO_PROGRESS_PHOTOS },
    refusedViews: PROGRESS_PHOTO_VIEWS.filter((view) => entry.photos[view]),
  };
}

export async function removeProgressPhoto(removal: PhotoRemoval): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (removal === 'fails') {
    throw new Error('The photo could not be removed.');
  }
}
