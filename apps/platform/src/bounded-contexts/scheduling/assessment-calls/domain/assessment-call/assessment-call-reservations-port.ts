import type { AssessmentCall } from "./assessment-call";

export type UpcomingCallQuestion = { visitorEmail: string; now: Date };

export type AssessmentCallReservation = {
  call: AssessmentCall;
  reservationId: string;
};

export interface AssessmentCallReservationsPort {
  lockVisitorEmail(visitorEmail: string): Promise<void>;
  findUpcomingCallFor(
    question: UpcomingCallQuestion,
  ): Promise<AssessmentCall | null>;
  add(reservation: AssessmentCallReservation): Promise<void>;
  findById(id: string): Promise<AssessmentCall | null>;
  listAll(): Promise<AssessmentCall[]>;
}
