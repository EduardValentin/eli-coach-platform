import {
  emptyAnswers,
  type OnboardingAnswersByForm,
} from "./onboarding-answers";
import { noConsents, type OnboardingConsents } from "./onboarding-consents";

export type OnboardingDraft = {
  answers: OnboardingAnswersByForm;
  currentFormIndex: number;
  consents: OnboardingConsents;
  updatedAt: Date;
};

export function emptyDraft(updatedAt: Date): OnboardingDraft {
  return {
    answers: emptyAnswers(),
    currentFormIndex: 0,
    consents: noConsents(),
    updatedAt,
  };
}
