import type { CheckInNote } from "./check-in-note";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInTimeZone } from "./check-in-time-zone";

export const CHECK_IN_PARTIES = ["client", "coach"] as const;
export const CHECK_IN_KINDS = ["ad_hoc"] as const;
export const RECORDED_CHECK_IN_STATUSES = [
  "pending",
  "approved",
  "cancelled",
] as const;

export type CheckInParty = (typeof CHECK_IN_PARTIES)[number];
export type CheckInKind = (typeof CHECK_IN_KINDS)[number];
export type RecordedCheckInStatus = (typeof RECORDED_CHECK_IN_STATUSES)[number];
export type CheckInStatus = RecordedCheckInStatus | "passed";
export type CheckInOutcome = Exclude<RecordedCheckInStatus, "pending">;
export type CheckInRefusal = "not_pending" | "expired" | "not_your_turn";
export type CheckInRequestDecision =
  "requested" | "request_waiting" | "time_taken";

export type CheckInProps = {
  id: string;
  clientId: string;
  startsAt: Date;
  clientTimeZone: string;
  coachTimeZone: string;
  kind: CheckInKind;
  recordedStatus: RecordedCheckInStatus;
  initiatedBy: CheckInParty;
  proposedBy: CheckInParty;
  note: string | null;
  requestedAt: Date;
  answeredAt: Date | null;
};

export type CheckInSnapshot = CheckInProps & {
  endsAt: Date;
  joinEmphasisFrom: Date;
};

export type CheckInView = CheckInSnapshot & {
  status: CheckInStatus;
  awaitsViewer: boolean;
  viewerMayWithdraw: boolean;
  isWaitingRequest: boolean;
};

type CheckInProposal = {
  id: string;
  clientId: string;
  startsAt: Date;
  clientTimeZone: CheckInTimeZone;
  coachTimeZone: string;
  note: CheckInNote | null;
  requestedAt: Date;
};

type PartyAtInstant = { party: CheckInParty; at: Date };

type SettledAnswer = {
  outcome: CheckInOutcome;
  at: Date;
  clientTimeZone?: CheckInTimeZone | null;
};

const MILLISECONDS_PER_MINUTE = 60_000;
const DURATION_MS = CHECK_IN_RULES.durationMinutes * MILLISECONDS_PER_MINUTE;
const JOIN_EMPHASIS_LEAD_MS = 10 * MILLISECONDS_PER_MINUTE;

export class CheckIn {
  readonly id: string;
  readonly clientId: string;
  readonly startsAt: Date;
  readonly clientTimeZone: string;
  readonly coachTimeZone: string;
  readonly kind: CheckInKind;
  readonly recordedStatus: RecordedCheckInStatus;
  readonly initiatedBy: CheckInParty;
  readonly proposedBy: CheckInParty;
  readonly note: string | null;
  readonly requestedAt: Date;
  readonly answeredAt: Date | null;

  private constructor(props: CheckInProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.startsAt = props.startsAt;
    this.clientTimeZone = props.clientTimeZone;
    this.coachTimeZone = props.coachTimeZone;
    this.kind = props.kind;
    this.recordedStatus = props.recordedStatus;
    this.initiatedBy = props.initiatedBy;
    this.proposedBy = props.proposedBy;
    this.note = props.note;
    this.requestedAt = props.requestedAt;
    this.answeredAt = props.answeredAt;
  }

  static reconstitute(props: CheckInProps): CheckIn {
    return new CheckIn(props);
  }

  static requestedByClient(request: CheckInProposal): CheckIn {
    return new CheckIn({
      ...request,
      clientTimeZone: request.clientTimeZone.name,
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: "client",
      proposedBy: "client",
      note: request.note?.text ?? null,
      answeredAt: null,
    });
  }

  static scheduledByCoach(schedule: CheckInProposal): CheckIn {
    return new CheckIn({
      ...schedule,
      clientTimeZone: schedule.clientTimeZone.name,
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: "coach",
      proposedBy: "coach",
      note: schedule.note?.text ?? null,
      answeredAt: null,
    });
  }

  static decideRequest(learned: {
    initiatedBy: CheckInParty;
    coachTime: "reserved" | "taken";
    clientCheckIns: readonly CheckIn[];
    at: Date;
  }): CheckInRequestDecision {
    if (
      learned.initiatedBy === "client" &&
      learned.clientCheckIns.some((checkIn) =>
        checkIn.isWaitingRequestAt(learned.at),
      )
    ) {
      return "request_waiting";
    }

    if (learned.coachTime === "taken") {
      return "time_taken";
    }

    return "requested";
  }

  endsAt(): Date {
    return new Date(this.startsAt.getTime() + DURATION_MS);
  }

  joinEmphasisFrom(): Date {
    return new Date(this.startsAt.getTime() - JOIN_EMPHASIS_LEAD_MS);
  }

  statusAt(now: Date): CheckInStatus {
    if (this.recordedStatus === "pending" && this.startsAt <= now) {
      return "cancelled";
    }

    if (this.recordedStatus === "approved" && this.endsAt() <= now) {
      return "passed";
    }

    return this.recordedStatus;
  }

  isFor(clientId: string): boolean {
    return this.clientId === clientId;
  }

  awaits(party: CheckInParty): boolean {
    return this.recordedStatus === "pending" && this.proposedBy !== party;
  }

  mayWithdraw(party: CheckInParty): boolean {
    return this.recordedStatus === "pending" && this.proposedBy === party;
  }

  isWaitingRequestAt(at: Date): boolean {
    return this.initiatedBy === "client" && this.statusAt(at) === "pending";
  }

  isJoinableAt(now: Date): boolean {
    return this.statusAt(now) === "approved";
  }

  answerRefusalFor({ party, at }: PartyAtInstant): CheckInRefusal | null {
    return (
      this.pendingRefusalAt(at) ?? (this.awaits(party) ? null : "not_your_turn")
    );
  }

  withdrawalRefusalFor({ party, at }: PartyAtInstant): CheckInRefusal | null {
    return (
      this.pendingRefusalAt(at) ??
      (this.mayWithdraw(party) ? null : "not_your_turn")
    );
  }

  settled(settlement: SettledAnswer): CheckIn {
    return new CheckIn({
      ...this.toProps(),
      clientTimeZone: settlement.clientTimeZone?.name ?? this.clientTimeZone,
      recordedStatus: settlement.outcome,
      answeredAt: settlement.at,
    });
  }

  viewFor(viewer: PartyAtInstant): CheckInView {
    return {
      ...this.toSnapshot(),
      status: this.statusAt(viewer.at),
      awaitsViewer: this.answerRefusalFor(viewer) === null,
      viewerMayWithdraw: this.withdrawalRefusalFor(viewer) === null,
      isWaitingRequest: this.isWaitingRequestAt(viewer.at),
    };
  }

  toSnapshot(): CheckInSnapshot {
    return {
      ...this.toProps(),
      endsAt: this.endsAt(),
      joinEmphasisFrom: this.joinEmphasisFrom(),
    };
  }

  private pendingRefusalAt(at: Date): CheckInRefusal | null {
    if (this.recordedStatus !== "pending") {
      return "not_pending";
    }

    if (this.statusAt(at) !== "pending") {
      return "expired";
    }

    return null;
  }

  private toProps(): CheckInProps {
    return {
      id: this.id,
      clientId: this.clientId,
      startsAt: this.startsAt,
      clientTimeZone: this.clientTimeZone,
      coachTimeZone: this.coachTimeZone,
      kind: this.kind,
      recordedStatus: this.recordedStatus,
      initiatedBy: this.initiatedBy,
      proposedBy: this.proposedBy,
      note: this.note,
      requestedAt: this.requestedAt,
      answeredAt: this.answeredAt,
    };
  }
}
