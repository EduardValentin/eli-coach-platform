import type { AssessmentCall } from "./assessment-call";

export type ReserveAssessmentCallCommand = {
  bookedAt: Date;
  coachTimeZone: string;
  fullName: string;
  normalizedEmail: string;
  notes: string | null;
  now: Date;
  startsAt: Date;
  visitorTimeZone: string;
};

export type ReservationResult =
  | { status: "reserved"; call: AssessmentCall }
  | { status: "slot_taken" }
  | { status: "email_has_upcoming_call" };

export interface AssessmentCallReservations {
  reserve(command: ReserveAssessmentCallCommand): Promise<ReservationResult>;
  findById(id: string): Promise<AssessmentCall | null>;
}
