import { describe, expect, it } from 'vitest';
import { CYCLE_MODE_LABELS, cycleModeOf } from './cycleMode';
import { emptyOnboardingDraft } from './journey';

function phaseBasedAnswers() {
  return {
    cycleRegularity: "Yes, and it's regular",
    hormonalContraception: 'None',
    lifeStage: ['None of these'],
    perimenopauseOrMenopause: 'No',
  };
}

describe('cycleModeOf', () => {
  it('is null when the cycle form has no answers', () => {
    // arrange
    const draft = emptyOnboardingDraft();

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBeNull();
  });

  it('is manual whenever contraception is something else', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = {
      ...phaseBasedAnswers(),
      hormonalContraception: 'Something else',
    };

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('manual');
    expect(CYCLE_MODE_LABELS[mode!]).toBe('Set by Eli');
  });

  it('is phase-based on a regular cycle, no combined pill, no life stage flag, and no perimenopause', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = phaseBasedAnswers();

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('phase-based');
    expect(CYCLE_MODE_LABELS[mode!]).toBe('Phase-based');
  });

  it('is symptom-based once the cycle is irregular or absent', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = {
      ...phaseBasedAnswers(),
      cycleRegularity: 'No, or very rarely',
    };

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('symptom-based');
  });

  it('is symptom-based on the combined pill', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = {
      ...phaseBasedAnswers(),
      hormonalContraception: 'Combined pill',
    };

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('symptom-based');
  });

  it('is symptom-based when a life-stage flag other than none applies', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = {
      ...phaseBasedAnswers(),
      lifeStage: ['Pregnant'],
    };

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('symptom-based');
  });

  it('is symptom-based during perimenopause or menopause', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['cycle-context'] = {
      ...phaseBasedAnswers(),
      perimenopauseOrMenopause: 'Yes, perimenopause',
    };

    // act
    const mode = cycleModeOf(draft);

    // assert
    expect(mode).toBe('symptom-based');
  });
});
