export type CoachTimeSpan = { start: Date; end: Date };

export type CoachTimeHold =
  { status: "reserved"; reservationId: string } | { status: "taken" };

export interface CoachTimePort {
  reserve(span: CoachTimeSpan): Promise<CoachTimeHold>;
  release(reservationId: string): Promise<void>;
}
