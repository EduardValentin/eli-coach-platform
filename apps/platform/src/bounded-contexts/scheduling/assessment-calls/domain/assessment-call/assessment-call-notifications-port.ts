import type { AssessmentCallSnapshot } from "./assessment-call";

export type AssessmentCallRecipient = "visitor" | "coach";

export type AssessmentCallNotificationResult = Record<
  AssessmentCallRecipient,
  "sent" | "failed"
>;

export interface AssessmentCallNotificationsPort {
  notifyBooked(
    call: AssessmentCallSnapshot,
  ): Promise<AssessmentCallNotificationResult>;
}
