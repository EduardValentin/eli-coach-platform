export type ReviewStamps = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export interface OnboardingReviewStamps {
  record(input: { clientId: string; stamps: ReviewStamps }): Promise<void>;
}
