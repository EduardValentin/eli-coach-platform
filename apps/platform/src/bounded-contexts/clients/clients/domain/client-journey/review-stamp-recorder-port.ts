export type ReviewStamps = {
  reviewOpenedAt: Date | null;
  detailsRequestedAt: Date | null;
  detailsAnsweredAt: Date | null;
  answersApprovedAt: Date | null;
};

export interface ReviewStampRecorderPort {
  recordReviewStamp(input: {
    clientId: string;
    stamps: ReviewStamps;
  }): Promise<void>;
}
