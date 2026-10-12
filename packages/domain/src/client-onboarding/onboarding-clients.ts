import type { CoachingStanding } from "../client";

import type { ReviewStamps } from "./onboarding-review-stamps";

export type OnboardingClient = {
  clientId: string;
  submittedAt: Date | null;
  reviewStamps: ReviewStamps;
  standing: CoachingStanding;
};

export interface OnboardingClients {
  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null>;
  findByClientId(clientId: string): Promise<OnboardingClient | null>;
}
