import type {
  DetailRequest,
  OnboardingDraft,
  OnboardingFormAnswers,
} from '../domain/journey';

export type OnboardingErrorCode = 'draft-unavailable';

export class OnboardingError extends Error {
  code: OnboardingErrorCode;

  constructor(code: OnboardingErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'OnboardingError';
  }
}

export const ONBOARDING_ERROR_MESSAGES: Record<OnboardingErrorCode, string> = {
  'draft-unavailable':
    "Your answers could not be saved on this device. They'll be sent when you submit.",
};

export type SubmittedOnboarding = {
  journeyId: string;
  submittedAt: Date;
};

export type AnsweredDetailRequest = {
  journeyId: string;
  answers: OnboardingFormAnswers;
  answeredAt: Date;
};

export const DRAFT_STORAGE_KEY = 'evoa.onboarding-drafts';

export const SIMULATED_LATENCY_MS = 900;

type StoredDrafts = Record<string, OnboardingDraft>;

function readStoredDrafts(): StoredDrafts {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredDrafts) : {};
  } catch {
    return {};
  }
}

function writeStoredDrafts(drafts: StoredDrafts): void {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    throw new OnboardingError(
      'draft-unavailable',
      ONBOARDING_ERROR_MESSAGES['draft-unavailable'],
    );
  }
}

export async function saveDraft(
  journeyId: string,
  draft: OnboardingDraft,
): Promise<OnboardingDraft> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  writeStoredDrafts({ ...readStoredDrafts(), [journeyId]: draft });

  return draft;
}

export function loadDraft(journeyId: string): OnboardingDraft | null {
  return readStoredDrafts()[journeyId] ?? null;
}

export function forgetDraft(journeyId: string): void {
  const drafts = readStoredDrafts();
  delete drafts[journeyId];
  writeStoredDrafts(drafts);
}

export async function submit(journeyId: string): Promise<SubmittedOnboarding> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return { journeyId, submittedAt: new Date() };
}

export async function answerRequest(
  journeyId: string,
  request: DetailRequest,
  answers: OnboardingFormAnswers,
): Promise<AnsweredDetailRequest> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  const answered = Object.fromEntries(
    request.questionIds.map((questionId) => [questionId, answers[questionId] ?? null]),
  );

  return { journeyId, answers: answered, answeredAt: new Date() };
}
