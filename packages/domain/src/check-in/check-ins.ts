import type {
  CheckIn,
  CheckInOutcome,
  RecordedCheckInStatus,
} from "./check-in";

export type CheckInRequestResult =
  | { status: "requested"; checkIn: CheckIn }
  | { status: "request_waiting" }
  | { status: "time_taken" };

export type CheckInSettlement = "settled" | "changed_meanwhile";

export type CheckInMove = "moved" | "time_taken" | "changed_meanwhile";

export type CheckInStartWindow = { since: Date; at: Date };

export type CheckInsAtCoachingEnd = {
  cancelled: string[];
  seriesStopped: boolean;
};

export interface CheckIns {
  request(command: {
    checkIn: CheckIn;
    at: Date;
  }): Promise<CheckInRequestResult>;
  find(id: string): Promise<CheckIn | null>;
  listForClient(clientId: string): Promise<CheckIn[]>;
  listAll(): Promise<CheckIn[]>;
  listUnansweredStartedWithin(window: CheckInStartWindow): Promise<CheckIn[]>;
  listUnansweredForClientStartedWithin(
    clientId: string,
    window: CheckInStartWindow,
  ): Promise<CheckIn[]>;
  settle(command: {
    id: string;
    outcome: CheckInOutcome;
    at: Date;
    expectedStatus: RecordedCheckInStatus;
    clientTimeZone?: string;
  }): Promise<CheckInSettlement>;
  move(command: {
    checkIn: CheckIn;
    expected: { recordedStatus: RecordedCheckInStatus; startsAt: Date };
    at: Date;
  }): Promise<CheckInMove>;
  endCoaching(command: {
    clientId: string;
    endsAt: Date;
    at: Date;
  }): Promise<CheckInsAtCoachingEnd>;
}
