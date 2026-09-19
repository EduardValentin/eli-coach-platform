import type { AssessmentCallRecipient } from "./assessment-call-notifications";

export interface AssessmentCallIncidents {
  bookingModeReadFailed(): void;
  notificationFailed(incident: { recipient: AssessmentCallRecipient }): void;
  slotsReadFailed(): void;
}
