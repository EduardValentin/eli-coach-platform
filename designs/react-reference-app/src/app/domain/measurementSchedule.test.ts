import { describe, expect, it } from 'vitest';
import {
  isMeasurementDue,
  measurementCadenceHint,
  measurementDueDates,
} from './measurementSchedule';

describe('the measurement schedule', () => {
  it('puts the next weight a week after the last entry', () => {
    // arrange
    const latest = new Date('2026-09-01T08:00:00Z');

    // act
    const due = measurementDueDates(latest);

    // assert
    expect(due.weight).toEqual(new Date('2026-09-08T08:00:00Z'));
  });

  it('puts the next circumferences four weeks after the last entry', () => {
    // arrange
    const latest = new Date('2026-09-01T08:00:00Z');

    // act
    const due = measurementDueDates(latest);

    // assert
    expect(due.circumferences).toEqual(new Date('2026-09-29T08:00:00Z'));
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

  it('adds the cycle window to the hint when her cycle is on file', () => {
    // arrange
    const tracksCycle = 'yes';

    // act
    const hint = measurementCadenceHint(tracksCycle);

    // assert
    expect(hint).toBe(
      'Weight: weekly. Circumferences and photos: every 4 weeks, best taken on days 5–10 of your cycle.',
    );
  });

  it('keeps the hint to the cadence without cycle data', () => {
    // arrange
    const tracksCycle = 'no';

    // act
    const hint = measurementCadenceHint(tracksCycle);

    // assert
    expect(hint).toBe('Weight: weekly. Circumferences and photos: every 4 weeks.');
  });
});
