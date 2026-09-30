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

export const SIMULATED_LATENCY_MS = 900;

export type RecordedMeasurements = {
  entry: MeasurementEntry;
  refusedViews: ProgressPhotoView[];
};

export async function recordMeasurements(
  entry: MeasurementEntry,
  processing: PhotoProcessing,
): Promise<RecordedMeasurements> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (processing === 'works') return { entry, refusedViews: [] };

  return {
    entry: { ...entry, photos: NO_PROGRESS_PHOTOS },
    refusedViews: PROGRESS_PHOTO_VIEWS.filter((view) => entry.photos[view]),
  };
}
