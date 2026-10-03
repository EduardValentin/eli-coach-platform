import type { VisitorGender } from "../assessment-call";

import type { ReviewStamps } from "./onboarding-review-stamps";

export type OnboardingClient = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: VisitorGender;
  dateOfBirth: string;
  country: string;
  phone: string | null;
  submittedAt: Date | null;
  reviewStamps: ReviewStamps;
  subscriptionCancelledOrEnded: boolean;
};

export interface OnboardingClients {
  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null>;
  findByClientId(clientId: string): Promise<OnboardingClient | null>;
}
