import type { DetailRequest } from "./detail-request";
import type { OnboardingAnswersByForm } from "./onboarding-answers";

type StoredOnboardingReview = {
  openedAt: Date | null;
  approvedAt: Date | null;
  requests: DetailRequest[];
};

type ReviewMoment = {
  clientId: string;
  at: Date;
};

type RecordDetailsAnswer = {
  clientId: string;
  requestId: string;
  mergedAnswers: OnboardingAnswersByForm;
  answeredAt: Date;
};

export interface OnboardingReviews {
  findByClientId(clientId: string): Promise<StoredOnboardingReview>;
  recordOpened(moment: ReviewMoment): Promise<void>;
  recordRequest(request: DetailRequest): Promise<void>;
  recordAnswer(input: RecordDetailsAnswer): Promise<void>;
  recordApproval(moment: ReviewMoment): Promise<void>;
}

export interface DetailRequestIdGenerator {
  generate(): string;
}
