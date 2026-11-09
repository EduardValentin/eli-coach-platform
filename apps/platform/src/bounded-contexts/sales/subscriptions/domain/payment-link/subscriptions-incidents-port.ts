export interface SubscriptionsIncidentsPort {
  salesModeReadFailed(error: unknown): void;
  paymentLinkEmailFailed(assessmentCallId: string): void;
}
