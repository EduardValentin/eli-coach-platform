import type { JourneyIdentity, OnboardingDraft } from './journey';

export const PARQ_MIN_AGE = 15;
export const PARQ_MAX_AGE = 69;

export const PARQ_QUESTION_IDS: readonly string[] = [
  'heartCondition',
  'chestPainOnExertion',
  'dizzinessOrFainting',
  'chronicConditionDiagnosed',
  'chronicConditionMedication',
  'boneOrJointProblem',
  'doctorProhibitedActivity',
];

export type ScreeningOutcome =
  | 'manual'
  | 'cleared'
  | 'needs-review'
  | 'pending';

export function ageOn(dateOfBirth: string, now: Date): number {
  const dob = new Date(dateOfBirth);
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  const beforeBirthdayThisYear =
    monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate());

  return beforeBirthdayThisYear ? age - 1 : age;
}

export function needsManualScreening(dateOfBirth: string, now: Date): boolean {
  const age = ageOn(dateOfBirth, now);

  return age < PARQ_MIN_AGE || age > PARQ_MAX_AGE;
}

export function withholdsNutritionAdvice(draft: OnboardingDraft): boolean {
  const answers = draft.answers['safety-screening'];

  return (
    answers.chronicConditionDiagnosed === 'Yes' ||
    answers.chronicConditionMedication === 'Yes'
  );
}

export function screeningOutcome(
  draft: OnboardingDraft,
  identity: JourneyIdentity,
  now: Date,
): ScreeningOutcome {
  if (needsManualScreening(identity.dateOfBirth, now)) return 'manual';

  const answers = draft.answers['safety-screening'];
  const responses = PARQ_QUESTION_IDS.map((id) => answers[id]);

  if (
    responses.some((response) => response === undefined || response === null)
  ) {
    return 'pending';
  }
  if (responses.every((response) => response === 'No')) return 'cleared';

  return 'needs-review';
}
