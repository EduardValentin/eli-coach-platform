import {
  ONBOARDING_FORM_IDS,
  type JourneySex,
  type OnboardingAnswer,
  type OnboardingDraft,
  type OnboardingFormAnswers,
  type OnboardingFormId,
} from './journey';
import { formsForSex, type OnboardingField } from './onboardingSchema';

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

export type ReviewAnswer = {
  questionId: string;
  label: string;
  answer: string | null;
  flagged: boolean;
};

export type ReviewForm = {
  formId: OnboardingFormId;
  title: string;
  answers: ReviewAnswer[];
  answeredCount: number;
};

function isFlagged(
  formId: OnboardingFormId,
  questionId: string,
  answer: OnboardingAnswer,
): boolean {
  if (formId === 'safety-screening') return isAffirmative(answer);
  if (formId === 'cycle-context') {
    return PREGNANCY_PATTERN.test(questionId) && isPositive(answer);
  }

  return false;
}

function isReachable(
  field: OnboardingField,
  given: OnboardingFormAnswers,
): boolean {
  if (!field.revealedBy) return true;

  const trigger = given[field.revealedBy.id];

  return trigger !== undefined && describeAnswer(trigger) === field.revealedBy.value;
}

const CANONICAL_UNITS: Record<string, string> = {
  weight: 'kg',
  height: 'cm',
  circumference: 'cm',
};

function readAnswer(field: OnboardingField, answer: OnboardingAnswer): string {
  const reading = describeAnswer(answer);
  if (typeof answer !== 'number') return reading;

  const unit = CANONICAL_UNITS[field.kind] ?? field.unitSuffix;

  return unit ? `${reading} ${unit}` : reading;
}

function reviewAnswer(
  formId: OnboardingFormId,
  field: OnboardingField,
  given: OnboardingFormAnswers,
): ReviewAnswer {
  const answer = given[field.id];
  const answered = answer !== undefined && isAnswered(answer);

  return {
    questionId: field.id,
    label: humaniseQuestionId(field.id),
    answer: answered ? readAnswer(field, answer) : null,
    flagged: answer !== undefined && isFlagged(formId, field.id, answer),
  };
}

export function reviewForms(draft: OnboardingDraft, sex: JourneySex): ReviewForm[] {
  return formsForSex(sex).map((definition) => {
    const given = draft.answers[definition.id];
    const answers = definition.fields
      .filter((field) => isReachable(field, given))
      .map((field) => reviewAnswer(definition.id, field, given));

    return {
      formId: definition.id,
      title: definition.title,
      answers,
      answeredCount: answers.filter((answer) => answer.answer !== null).length,
    };
  });
}
