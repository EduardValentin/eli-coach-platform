import type { AssessmentCall, ReservationDecision } from "./assessment-call";

export type ReserveAssessmentCallCommand = {
  call: AssessmentCall;
  now: Date;
};

export interface AssessmentCallReservations {
  reserve(command: ReserveAssessmentCallCommand): Promise<ReservationDecision>;
  findById(id: string): Promise<AssessmentCall | null>;
  listAll(): Promise<AssessmentCall[]>;
}
