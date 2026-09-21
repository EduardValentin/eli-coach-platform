import { describe, expect, it } from 'vitest';
import {
  measurementAnswersFrom,
  measurementEntryFrom,
  submittedMeasurementEntry,
} from './measurements';
import { emptyOnboardingDraft } from './journey';

const RECORDED_AT = new Date('2026-09-21T08:00:00.000Z');

describe('a measurement entry', () => {
  it('holds kilograms and centimetres, whatever the client entered them in', () => {
    // arrange
    const answers = { weight: 68.04, waist: 68.5, hips: 99, thigh: 57, arm: 28 };

    // act
    const entry = measurementEntryFrom(answers, RECORDED_AT);

    // assert
    expect(entry).toEqual({
      recordedAt: RECORDED_AT,
      weightKg: 68.04,
      waistCm: 68.5,
      hipsCm: 99,
      thighCm: 57,
      armCm: 28,
    });
  });

  it('takes the weight from the first form and the rest from the measurements form', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['goal-availability'] = { weight: 68.04 };
    draft.answers.measurements = { waist: 68.5 };

    // act
    const entry = submittedMeasurementEntry(draft.answers, RECORDED_AT);

    // assert
    expect(entry?.weightKg).toBe(68.04);
    expect(entry?.waistCm).toBe(68.5);
  });

  it('reads back into the same canonical answers', () => {
    // arrange
    const entry = measurementEntryFrom({ weight: 66.1, waist: 74 }, RECORDED_AT);

    // act
    const answers = measurementAnswersFrom(entry ?? undefined);

    // assert
    expect(answers).toEqual({ weight: 66.1, waist: 74 });
  });
});
