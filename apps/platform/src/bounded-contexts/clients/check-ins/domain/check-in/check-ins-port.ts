import type {
  CheckIn,
  CheckInOutcome,
  RecordedCheckInStatus,
} from "./check-in";

export type CheckInRequestResult =
  | { status: "requested"; checkIn: CheckIn }
  | { status: "request_waiting" }
  | { status: "time_taken" };

export type HeldCheckIn = { checkIn: CheckIn; reservationId: string | null };

export type CheckInSettlement =
  | { status: "settled"; freedReservationId: string | null }
  | { status: "changed_meanwhile" };

export type CheckInMove =
  | { status: "moved"; freedReservationId: string | null }
  | { status: "changed_meanwhile" };

export type CheckInMoveCommand = {
  checkIn: CheckIn;
  expected: { recordedStatus: RecordedCheckInStatus; startsAt: Date };
  reservationId?: string;
  at: Date;
};

export type CheckInsAtCoachingEnd = {
  cancelled: string[];
  seriesStopped: boolean;
  freedReservationIds: string[];
};

export interface CheckInsPort {
  listForClientLocked(clientId: string): Promise<CheckIn[]>;
  add(held: HeldCheckIn): Promise<void>;
  find(id: string): Promise<CheckIn | null>;
  listForClient(clientId: string): Promise<CheckIn[]>;
  listAll(): Promise<CheckIn[]>;
  settle(command: {
    id: string;
    outcome: CheckInOutcome;
    at: Date;
    expectedStatus: RecordedCheckInStatus;
    clientTimeZone?: string;
  }): Promise<CheckInSettlement>;
  move(command: CheckInMoveCommand): Promise<CheckInMove>;
  endCoaching(command: {
    clientId: string;
    endsAt: Date;
    at: Date;
  }): Promise<CheckInsAtCoachingEnd>;
}
