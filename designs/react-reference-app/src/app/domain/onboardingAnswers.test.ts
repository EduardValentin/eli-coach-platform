import { describe, expect, it } from 'vitest';
import {
  emptyOnboardingDraft,
  type OnboardingDraft,
  type OnboardingFormAnswers,
  type OnboardingFormId,
} from './journey';
import { reviewForms } from './onboardingAnswers';

function draftAnswering(
  formId: OnboardingFormId,
  answers: OnboardingFormAnswers,
): OnboardingDraft {
  const draft = emptyOnboardingDraft();

  return { ...draft, answers: { ...draft.answers, [formId]: answers } };
}

function flaggedQuestionIds(draft: OnboardingDraft): string[] {
  return reviewForms(draft, 'female')
    .flatMap((form) => form.answers)
    .filter((answer) => answer.flagged)
    .map((answer) => answer.questionId);
}

const CLEAR_PARQ: OnboardingFormAnswers = {
  heartCondition: 'No',
  chestPainOnExertion: 'No',
  dizzinessOrFainting: 'No',
  chronicConditionDiagnosed: 'No',
  chronicConditionMedication: 'No',
  boneOrJointProblem: 'No',
  doctorProhibitedActivity: 'No',
};

describe('the answers the coach should look at', () => {
  it('never flags the signed safety declaration', () => {
    // arrange
    const draft = draftAnswering('safety-screening', {
      ...CLEAR_PARQ,
      parqDeclaration: true,
    });

    // act
    const flagged = flaggedQuestionIds(draft);

    // assert
    expect(flagged).toEqual([]);
  });

  it('flags each safety question she answered yes', () => {
    // arrange
    const draft = draftAnswering('safety-screening', {
      ...CLEAR_PARQ,
      heartCondition: 'Yes',
      boneOrJointProblem: 'Yes',
      boneOrJointProblemList: 'Yes',
      parqDeclaration: true,
    });

    // act
    const flagged = flaggedQuestionIds(draft);

    // assert
    expect(flagged).toEqual(['heartCondition', 'boneOrJointProblem']);
  });

  it('flags a pregnant or postpartum life stage', () => {
    // arrange
    const draft = draftAnswering('cycle-context', {
      lifeStage: ['Pregnant'],
    });

    // act
    const flagged = flaggedQuestionIds(draft);

    // assert
    expect(flagged).toEqual(['lifeStage']);
  });

  it('flags migraines only together with the combined pill', () => {
    // arrange
    const withPill = draftAnswering('cycle-context', {
      hormonalContraception: 'Combined pill',
      recurringSymptoms: ['Migraines'],
    });
    const withoutPill = draftAnswering('cycle-context', {
      hormonalContraception: 'None',
      recurringSymptoms: ['Migraines'],
    });

    // act
    const flaggedWithPill = flaggedQuestionIds(withPill);
    const flaggedWithoutPill = flaggedQuestionIds(withoutPill);

    // assert
    expect(flaggedWithPill).toEqual(['recurringSymptoms']);
    expect(flaggedWithoutPill).toEqual([]);
  });
});
