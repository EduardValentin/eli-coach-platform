import type { TimeInterval } from "./time-interval";

export type CoachTimeHold =
  { status: "reserved"; reservationId: string } | { status: "taken" };

export interface CoachTimeReservationsPort {
  reserve(interval: TimeInterval): Promise<CoachTimeHold>;
  release(reservationId: string): Promise<void>;
}
