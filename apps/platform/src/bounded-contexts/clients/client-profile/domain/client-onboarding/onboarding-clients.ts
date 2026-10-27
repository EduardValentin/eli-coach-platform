import type { ReviewStamps } from "./onboarding-review-stamps";

type OnboardingCoachingStanding = {
  hasPortalAccessAt(now: Date): boolean;
  isCancelledOrEnded(): boolean;
};

export type OnboardingClient = {
  clientId: string;
  submittedAt: Date | null;
  reviewStamps: ReviewStamps;
  standing: OnboardingCoachingStanding;
};

export interface OnboardingClients {
  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null>;
  findByClientId(clientId: string): Promise<OnboardingClient | null>;
}
