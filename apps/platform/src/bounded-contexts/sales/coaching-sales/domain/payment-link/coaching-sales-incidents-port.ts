export interface CoachingSalesIncidentsPort {
  salesModeReadFailed(error: unknown): void;
  paymentLinkEmailFailed(assessmentCallId: string): void;
}
