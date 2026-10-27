export interface CoachingPeriodHandler {
  paidThroughExtended(notice: {
    clientId: string;
    paidThrough: Date;
  }): Promise<void>;
  programStarted(notice: { clientId: string; startsAt: Date }): Promise<void>;
}
