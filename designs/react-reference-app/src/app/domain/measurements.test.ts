import { describe, expect, it } from 'vitest';
import {
  isAcceptedProgressPhoto,
  measurementAnswersFrom,
  PROGRESS_PHOTO_MAX_BYTES,
  measurementEntryFrom,
  submittedMeasurementEntry,
  withoutProgressPhoto,
} from './measurements';
import {
  emptyOnboardingDraft,
  NO_PROGRESS_PHOTOS,
  type MeasurementEntry,
} from './journey';

const RECORDED_AT = new Date('2026-09-21T08:00:00.000Z');

function entryDaysAgo(
  days: number,
  optional: Partial<MeasurementEntry> = {},
): MeasurementEntry {
  const recordedAt = new Date(RECORDED_AT.getTime() - days * 86_400_000);

  return {
    id: `entry-${days}`,
    recordedAt,
    weightKg: 66,
    waistCm: 74,
    photos: NO_PROGRESS_PHOTOS,
    ...optional,
  };
}

describe('a measurement entry', () => {
  it('holds kilograms and centimetres, whatever the client entered them in', () => {
    // arrange
    const answers = { weight: 68.04, waist: 68.5, hips: 99, thigh: 57, arm: 28 };

    // act
    const entry = measurementEntryFrom(answers, RECORDED_AT, NO_PROGRESS_PHOTOS);

    // assert
    expect(entry).toEqual({
      id: expect.any(String),
      recordedAt: RECORDED_AT,
      weightKg: 68.04,
      waistCm: 68.5,
      hipsCm: 99,
      thighCm: 57,
      armCm: 28,
      photos: {},
    });
  });

  it('gets its own id every time one is recorded', () => {
    // arrange
    const answers = { weight: 66.1, waist: 74 };

    // act
    const first = measurementEntryFrom(answers, RECORDED_AT, NO_PROGRESS_PHOTOS);
    const second = measurementEntryFrom(answers, RECORDED_AT, NO_PROGRESS_PHOTOS);

    // assert
    expect(first?.id).not.toBe(second?.id);
  });

  it('carries the photos she added with it', () => {
    // arrange
    const photos = { front: { url: 'blob:front' }, back: { url: 'blob:back' } };

    // act
    const entry = measurementEntryFrom(
      { weight: 66.1, waist: 74 },
      RECORDED_AT,
      photos,
    );

    // assert
    expect(entry?.photos).toEqual(photos);
  });

  it('takes the weight from the first form and the rest from the measurements form, without photos', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['goal-availability'] = { weight: 68.04 };
    draft.answers.measurements = { waist: 68.5 };

    // act
    const entry = submittedMeasurementEntry(draft.answers, RECORDED_AT);

    // assert
    expect(entry?.weightKg).toBe(68.04);
    expect(entry?.waistCm).toBe(68.5);
    expect(entry?.photos).toEqual({});
  });

  it('reads back into the same canonical answers', () => {
    // arrange
    const entry = measurementEntryFrom(
      { weight: 66.1, waist: 74 },
      RECORDED_AT,
      NO_PROGRESS_PHOTOS,
    );

    // act
    const answers = measurementAnswersFrom(entry ?? undefined);

    // assert
    expect(answers).toEqual({ weight: 66.1, waist: 74 });
  });

  it('keeps its numbers and its other photos when one photo is removed', () => {
    // arrange
    const entry = entryDaysAgo(0, {
      hipsCm: 98,
      photos: { front: { url: 'blob:front' }, side: { url: 'blob:side' } },
    });

    // act
    const remaining = withoutProgressPhoto(entry, 'front');

    // assert
    expect(remaining).toEqual({
      ...entry,
      photos: { side: { url: 'blob:side' } },
    });
  });
});

describe('an accepted progress photo', () => {
  it('is a JPEG, PNG or WebP of up to 10 MB', () => {
    // arrange
    const files = [
      { type: 'image/jpeg', size: PROGRESS_PHOTO_MAX_BYTES },
      { type: 'image/png', size: 1 },
      { type: 'image/webp', size: 2048 },
    ];

    // act
    const accepted = files.map(isAcceptedProgressPhoto);

    // assert
    expect(accepted).toEqual([true, true, true]);
  });

  it('is refused over 10 MB or in any other format', () => {
    // arrange
    const files = [
      { type: 'image/jpeg', size: PROGRESS_PHOTO_MAX_BYTES + 1 },
      { type: 'image/heic', size: 2048 },
      { type: 'image/gif', size: 2048 },
    ];

    // act
    const accepted = files.map(isAcceptedProgressPhoto);

    // assert
    expect(accepted).toEqual([false, false, false]);
  });
});
