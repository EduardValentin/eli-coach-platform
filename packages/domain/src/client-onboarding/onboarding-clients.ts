import type { VisitorGender } from "../assessment-call";

import type { ReviewStamps } from "./onboarding-review-stamps";

export type OnboardingClient = {
  clientId: string;
  firstName: string;
  email: string;
  gender: VisitorGender;
  dateOfBirth: string;
  submittedAt: Date | null;
  reviewStamps: ReviewStamps;
};

export interface OnboardingClients {
  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null>;
  findByClientId(clientId: string): Promise<OnboardingClient | null>;
}
