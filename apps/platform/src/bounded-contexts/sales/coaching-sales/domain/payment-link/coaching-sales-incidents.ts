export interface CoachingSalesIncidents {
  salesModeReadFailed(error: unknown): void;
  paymentLinkEmailFailed(assessmentCallId: string): void;
}
