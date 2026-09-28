import type { ReviewStamps } from "./onboarding-review";

export interface OnboardingReviewStamps {
  record(input: { clientId: string; stamps: ReviewStamps }): Promise<void>;
}
