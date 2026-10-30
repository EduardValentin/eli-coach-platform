export type ReviewStamps = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export interface OnboardingReviewStampsPort {
  record(input: { clientId: string; stamps: ReviewStamps }): Promise<void>;
}
