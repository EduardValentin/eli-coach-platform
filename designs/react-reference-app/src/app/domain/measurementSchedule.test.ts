import { describe, expect, it } from 'vitest';
import { isMeasurementDue, measurementDueDates } from './measurementSchedule';
import type { MeasurementEntry } from './journey';

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
