import { describe, expect, it } from 'vitest';
import {
  isMeasurementDue,
  measurementDueDates,
  measurementDueLine,
} from './measurementSchedule';
import { NO_PROGRESS_PHOTOS, type MeasurementEntry } from './journey';

function entry(
  recordedAt: string,
  optional: Partial<MeasurementEntry> = {},
): MeasurementEntry {
  return {
    id: recordedAt,
    recordedAt: new Date(recordedAt),
    weightKg: 66,
    waistCm: 74,
    photos: {},
    ...optional,
  };
}

describe('the measurement schedule', () => {
  it('has nothing to schedule before her first entry', () => {
    // arrange
    const entries: MeasurementEntry[] = [];

    // act
    const due = measurementDueDates(entries);

    // assert
    expect(due).toBeNull();
  });

  it('puts the next weigh-in a week after her latest entry', () => {
    // arrange
    const entries = [
      entry('2026-08-25T08:00:00Z', { hipsCm: 98 }),
      entry('2026-09-01T08:00:00Z'),
    ];

    // act
    const due = measurementDueDates(entries);

    // assert
    expect(due?.weighIn).toEqual(new Date('2026-09-08T08:00:00Z'));
  });

  it('puts the next full set four weeks after her latest entry with an optional measurement', () => {
    // arrange
    const entries = [
      entry('2026-08-25T08:00:00Z', { thighCm: 57 }),
      entry('2026-09-01T08:00:00Z'),
    ];

    // act
    const due = measurementDueDates(entries);

    // assert
    expect(due?.measurements).toEqual(new Date('2026-09-22T08:00:00Z'));
  });

  it('counts an entry with a photo as a full set', () => {
    // arrange
    const entries = [
      entry('2026-08-01T08:00:00Z', { armCm: 28 }),
      entry('2026-08-25T08:00:00Z', { photos: { side: { url: 'blob:side' } } }),
      entry('2026-09-01T08:00:00Z'),
    ];

    // act
    const due = measurementDueDates(entries);

    // assert
    expect(due?.measurements).toEqual(new Date('2026-09-22T08:00:00Z'));
  });

  it('counts four weeks from her first entry when no entry has an optional measurement or a photo', () => {
    // arrange
    const entries = [
      entry('2026-09-01T08:00:00Z'),
      entry('2026-08-18T08:00:00Z'),
    ];

    // act
    const due = measurementDueDates(entries);

    // assert
    expect(due?.measurements).toEqual(new Date('2026-09-15T08:00:00Z'));
  });

  it('counts a due date reached today as due', () => {
    // arrange
    const dueOn = new Date('2026-09-08T08:00:00Z');

    // act
    const due = isMeasurementDue(dueOn, new Date('2026-09-08T09:00:00Z'));

    // assert
    expect(due).toBe(true);
  });

  it('leaves a future due date alone', () => {
    // arrange
    const dueOn = new Date('2026-09-08T08:00:00Z');

    // act
    const due = isMeasurementDue(dueOn, new Date('2026-09-07T23:00:00Z'));

    // assert
    expect(due).toBe(false);
  });
});

const NOW = new Date('2026-09-21T08:00:00.000Z');

function entryDaysAgo(
  days: number,
  optional: Partial<MeasurementEntry> = {},
): MeasurementEntry {
  return {
    id: `entry-${days}`,
    recordedAt: new Date(NOW.getTime() - days * 86_400_000),
    weightKg: 66,
    waistCm: 74,
    photos: NO_PROGRESS_PHOTOS,
    ...optional,
  };
}

describe('the measurements due line', () => {
  it('stays quiet before her first entry', () => {
    // arrange
    const entries: MeasurementEntry[] = [];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBeNull();
  });

  it('stays quiet within a week of her latest entry', () => {
    // arrange
    const entries = [entryDaysAgo(6, { hipsCm: 98 })];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBeNull();
  });

  it('asks for the weekly weigh-in seven days after her latest entry', () => {
    // arrange
    const entries = [entryDaysAgo(20, { hipsCm: 98 }), entryDaysAgo(7)];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBe('weigh-in');
  });

  it('asks for measurements and photos 28 days after her latest entry with an optional value', () => {
    // arrange
    const entries = [entryDaysAgo(28, { armCm: 28 }), entryDaysAgo(3)];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBe('measurements');
  });

  it('asks for measurements and photos 28 days after her first entry when none has an optional value or a photo', () => {
    // arrange
    const entries = [entryDaysAgo(28), entryDaysAgo(3)];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBe('measurements');
  });

  it('prefers the measurements line when both are due', () => {
    // arrange
    const entries = [entryDaysAgo(29, { thighCm: 57 })];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBe('measurements');
  });

  it('counts a photo-only entry as her latest full set', () => {
    // arrange
    const entries = [
      entryDaysAgo(40, { hipsCm: 98 }),
      entryDaysAgo(8, { photos: { back: { url: 'blob:back' } } }),
    ];

    // act
    const line = measurementDueLine(entries, NOW);

    // assert
    expect(line).toBe('weigh-in');
  });
});
