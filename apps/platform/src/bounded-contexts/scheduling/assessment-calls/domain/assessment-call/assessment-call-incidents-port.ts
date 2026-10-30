import type { AssessmentCallRecipient } from "./assessment-call-notifications-port";

export interface AssessmentCallIncidentsPort {
  bookingModeReadFailed(): void;
  callsReadFailed(): void;
  notificationFailed(incident: { recipient: AssessmentCallRecipient }): void;
  slotsReadFailed(): void;
}
