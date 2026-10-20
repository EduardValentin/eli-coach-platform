import { describe, expect, it } from 'vitest';
import { CYCLE_MODE_LABELS, cycleModeOf } from './cycleMode';
import { emptyOnboardingDraft } from './journey';

function draftWith(answers: Record<string, unknown>) {
  const draft = emptyOnboardingDraft();
  draft.answers['cycle-context'] = {
    cycleRegularity: "Yes, and it's regular",
    hormonalContraception: 'None',
    lifeStage: ['None of these'],
    perimenopauseOrMenopause: 'No',
    ...answers,
  };
  return draft;
}

describe('cycleModeOf', () => {
  it('is null while the cycle form is empty', () => {
    // arrange
    const draft = emptyOnboardingDraft();

    // act
    const mode = cycleModeOf(draft, 'female');

    // assert
    expect(mode).toBeNull();
  });

  it('is null when she preferred not to say and the cycle form is empty', () => {
    // arrange
    const draft = emptyOnboardingDraft();

    // act
    const mode = cycleModeOf(draft, 'prefer-not-to-say');

    // assert
    expect(mode).toBeNull();
  });

  it('is general for a male account whatever the cycle form holds', () => {
    // arrange
    const draft = emptyOnboardingDraft();

    // act
    const mode = cycleModeOf(draft, 'male');

    // assert
    expect(mode).toBe('general');
  });

  it.each([
    ['Combined pill', 'general'],
    ['Mini pill (progestogen-only)', 'adapted'],
    ['Hormonal IUD', 'adapted'],
    ['Copper IUD (non-hormonal)', 'adapted'],
    ['None', 'adapted'],
    ['Something else', 'adapted'],
  ])('contraception %s gives %s', (contraception, expected) => {
    // arrange
    const draft = draftWith({ hormonalContraception: contraception });

    // act
    const mode = cycleModeOf(draft, 'female');

    // assert
    expect(mode).toBe(expected);
  });

  it.each([
    ['without a period', { cycleRegularity: 'No, or very rarely' }],
    ['in perimenopause', { perimenopauseOrMenopause: 'Yes, perimenopause' }],
    ['in menopause', { perimenopauseOrMenopause: 'Yes, menopause' }],
  ])('is general %s', (_situation, answers) => {
    // arrange
    const draft = draftWith(answers);

    // act
    const mode = cycleModeOf(draft, 'female');

    // assert
    expect(mode).toBe('general');
  });

  it.each(['Pregnant', 'Postpartum', 'Breastfeeding'])(
    'stays adapted when %s',
    (lifeStage) => {
      // arrange
      const draft = draftWith({ lifeStage: [lifeStage] });

      // act
      const mode = cycleModeOf(draft, 'female');

      // assert
      expect(mode).toBe('adapted');
    },
  );

  it('labels the two modes', () => {
    // assert
    expect(CYCLE_MODE_LABELS).toEqual({
      adapted: 'Adapted to symptoms',
      general: 'General',
    });
  });
});
