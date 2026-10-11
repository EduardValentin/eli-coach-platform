import type {
  CheckIn,
  CheckInOutcome,
  RecordedCheckInStatus,
} from "./check-in";

export type CheckInRequestResult =
  | { status: "requested"; checkIn: CheckIn }
  | { status: "request_waiting" }
  | { status: "time_taken" };

export type CheckInSettlement = "settled" | "not_pending";

export type CheckInMove = "moved" | "time_taken" | "not_pending";

export interface CheckIns {
  request(command: {
    checkIn: CheckIn;
    at: Date;
  }): Promise<CheckInRequestResult>;
  find(id: string): Promise<CheckIn | null>;
  listForClient(clientId: string): Promise<CheckIn[]>;
  listAll(): Promise<CheckIn[]>;
  settle(command: {
    id: string;
    outcome: CheckInOutcome;
    at: Date;
    from: RecordedCheckInStatus;
    clientTimeZone?: string;
  }): Promise<CheckInSettlement>;
  move(command: {
    checkIn: CheckIn;
    expected: { recordedStatus: RecordedCheckInStatus; startsAt: Date };
    at: Date;
  }): Promise<CheckInMove>;
  cancelFrom(command: {
    clientId: string;
    from: Date;
    at: Date;
  }): Promise<{ cancelled: string[] }>;
}
