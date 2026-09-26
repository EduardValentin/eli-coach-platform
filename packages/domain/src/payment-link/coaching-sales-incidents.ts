export interface CoachingSalesIncidents {
  salesModeReadFailed(error: unknown): void;
  paymentLinkEmailFailed(assessmentCallId: string): void;
  paymentEventRejected(incident: {
    eventId: string;
    reason: "call_not_found" | "call_already_paid";
  }): void;
}
