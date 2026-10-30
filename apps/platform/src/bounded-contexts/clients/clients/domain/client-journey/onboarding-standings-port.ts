import type { CoachingStanding } from "../client";

import type { ReviewStamps } from "./review-stamp-recorder-port";

export type OnboardingStanding = {
  clientId: string;
  submittedAt: Date | null;
  reviewStamps: ReviewStamps;
  standing: CoachingStanding;
};

export interface OnboardingStandingsPort {
  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<OnboardingStanding | null>;
  findByClientId(clientId: string): Promise<OnboardingStanding | null>;
}
