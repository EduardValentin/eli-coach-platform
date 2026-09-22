import type { AssessmentCall } from "./assessment-call";
import type { VisitorGender, VisitorPrimaryGoal } from "./visitor-profile";

export type ReserveAssessmentCallCommand = {
  bookedAt: Date;
  coachTimeZone: string;
  country: string;
  dateOfBirth: string;
  firstName: string;
  gender: VisitorGender;
  lastName: string;
  normalizedEmail: string;
  notes: string | null;
  now: Date;
  phone: string | null;
  primaryGoal: VisitorPrimaryGoal;
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
  listAll(): Promise<AssessmentCall[]>;
}
