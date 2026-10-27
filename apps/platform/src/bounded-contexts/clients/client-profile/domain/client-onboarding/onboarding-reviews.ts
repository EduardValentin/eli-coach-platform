import type { CoachingSeed } from "../client-profile";

import type { DetailRequest } from "./detail-request";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { ReviewStamps } from "./onboarding-review-stamps";

type StoredOnboardingReview = {
  openedAt: Date | null;
  approvedAt: Date | null;
  requests: DetailRequest[];
};

type ReviewMoment = {
  clientId: string;
  at: Date;
  stamps: ReviewStamps;
};

type RecordApproval = ReviewMoment & {
  seed: CoachingSeed;
};

type RecordDetailRequest = {
  request: DetailRequest;
  stamps: ReviewStamps;
};

type RecordDetailsAnswer = {
  clientId: string;
  requestId: string;
  mergedAnswers: OnboardingAnswersByForm;
  answeredAt: Date;
  stamps: ReviewStamps;
};

export interface OnboardingReviews {
  findByClientId(clientId: string): Promise<StoredOnboardingReview>;
  recordOpened(moment: ReviewMoment): Promise<void>;
  recordRequest(
    input: RecordDetailRequest,
  ): Promise<"recorded" | "already-open">;
  recordAnswer(input: RecordDetailsAnswer): Promise<void>;
  recordApproval(approval: RecordApproval): Promise<void>;
}
