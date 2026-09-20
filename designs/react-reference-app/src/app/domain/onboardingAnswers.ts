import {
  ONBOARDING_FORM_IDS,
  type OnboardingAnswer,
  type OnboardingDraft,
  type OnboardingFormId,
} from './journey';

export const ONBOARDING_FORM_LABELS: Record<OnboardingFormId, string> = {
  'goal-availability': 'Goal and availability',
  'safety-screening': 'Safety screening',
  'cycle-context': 'Cycle and hormonal context',
  'nutrition-lifestyle': 'Nutrition and lifestyle',
  measurements: 'Measurements',
};

export const CHECK_IN_DAY_KEY = 'checkInDay';
export const CHECK_IN_CHANNEL_KEY = 'checkInChannel';

export type AnsweredQuestion = {
  formId: OnboardingFormId;
  questionId: string;
  label: string;
  answer: string;
};

export type AnsweredForm = {
  formId: OnboardingFormId;
  label: string;
  questions: AnsweredQuestion[];
};

const PREGNANCY_PATTERN = /pregnan|postpartum/i;

const NEGATIVE_ANSWERS: ReadonlySet<string> = new Set(['no', 'none']);

export function humaniseQuestionId(questionId: string): string {
  const spaced = questionId
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function describeAnswer(answer: OnboardingAnswer): string {
  if (answer === null) return 'Not answered';
  if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
  if (Array.isArray(answer)) return answer.join(', ');

  return String(answer);
}

function isAnswered(answer: OnboardingAnswer): boolean {
  if (answer === null || answer === false) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === 'string') return answer.trim().length > 0;

  return true;
}

function isAffirmative(answer: OnboardingAnswer): boolean {
  if (typeof answer === 'boolean') return answer;
  if (typeof answer === 'string') return answer.trim().toLowerCase() === 'yes';

  return false;
}

function questionsOfForm(
  draft: OnboardingDraft,
  formId: OnboardingFormId,
): AnsweredQuestion[] {
  return Object.entries(draft.answers[formId]).map(([questionId, answer]) => ({
    formId,
    questionId,
    label: humaniseQuestionId(questionId),
    answer: describeAnswer(answer),
  }));
}

export function answeredForms(draft: OnboardingDraft): AnsweredForm[] {
  return ONBOARDING_FORM_IDS.map((formId) => ({
    formId,
    label: ONBOARDING_FORM_LABELS[formId],
    questions: questionsOfForm(draft, formId),
  }));
}

export function answeredQuestions(draft: OnboardingDraft): AnsweredQuestion[] {
  return answeredForms(draft).flatMap((form) => form.questions);
}

function isPositive(answer: OnboardingAnswer): boolean {
  if (!isAnswered(answer)) return false;

  return !(
    typeof answer === 'string' && NEGATIVE_ANSWERS.has(answer.trim().toLowerCase())
  );
}

export function hasPregnancyContext(draft: OnboardingDraft): boolean {
  return Object.entries(draft.answers['cycle-context']).some(
    ([questionId, answer]) =>
      PREGNANCY_PATTERN.test(questionId) && isPositive(answer),
  );
}

export function needsSafetyLook(draft: OnboardingDraft): boolean {
  const screening = Object.values(draft.answers['safety-screening']);

  return screening.some(isAffirmative) || hasPregnancyContext(draft);
}

export function collaborationPreference(
  draft: OnboardingDraft,
  key: string,
): string | null {
  const answer = draft.answers['nutrition-lifestyle'][key];

  return answer !== undefined && isAnswered(answer)
    ? describeAnswer(answer)
    : null;
}
