import { CHECK_IN_KIND_POLICIES, type CheckInKind } from "./check-in-kind";
import type { CheckInNote } from "./check-in-note";
import type { CheckInParty } from "./check-in-party";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInTimeZone } from "./check-in-time-zone";

export const RECORDED_CHECK_IN_STATUSES = [
  "pending",
  "approved",
  "cancelled",
] as const;

export type RecordedCheckInStatus = (typeof RECORDED_CHECK_IN_STATUSES)[number];
export type CheckInStatus = RecordedCheckInStatus | "passed";
export type CheckInOutcome = Exclude<RecordedCheckInStatus, "pending">;
export type CheckInAnswerRefusal = "not_pending" | "expired" | "not_your_turn";
export type CheckInProposalRefusal = CheckInAnswerRefusal | "moves_exhausted";
export type CheckInCancellationRefusal =
  "not_approved" | "expired" | "not_allowed";
export type CheckInRefusal =
  CheckInProposalRefusal | CheckInCancellationRefusal;
export type CheckInRequestDecision =
  "requested" | "request_waiting" | "time_taken";
export type CheckInViewerProposal = "allowed" | "exhausted" | "none";

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
  earlierStartsAt: Date | null;
  moves: number;
  newTimeNote: string | null;
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
  viewerProposal: CheckInViewerProposal;
  viewerMayCancel: boolean;
};

export type CheckInNewTime = {
  party: CheckInParty;
  startsAt: Date;
  note: CheckInNote | null;
  at: Date;
  clientTimeZone?: CheckInTimeZone | null;
};

export type ProposedNewTime =
  { status: "proposed"; checkIn: CheckIn } | { status: CheckInProposalRefusal };

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

type CoachingEndCut = { startsAt: Date; coachingEndsAt: Date | null };

const MILLISECONDS_PER_MINUTE = 60_000;
const DURATION_MS = CHECK_IN_RULES.durationMinutes * MILLISECONDS_PER_MINUTE;
const JOIN_EMPHASIS_LEAD_MS = 10 * MILLISECONDS_PER_MINUTE;
export const MAX_CHECK_IN_MOVES = 2;

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
  readonly earlierStartsAt: Date | null;
  readonly moves: number;
  readonly newTimeNote: string | null;

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
    this.earlierStartsAt = props.earlierStartsAt;
    this.moves = props.moves;
    this.newTimeNote = props.newTimeNote;
  }

  static reconstitute(props: CheckInProps): CheckIn {
    return new CheckIn(props);
  }

  static requestedByClient(request: CheckInProposal): CheckIn {
    return CheckIn.proposedBy("client", request);
  }

  static scheduledByCoach(schedule: CheckInProposal): CheckIn {
    return CheckIn.proposedBy("coach", schedule);
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

  static startsBeforeCoachingEnd({
    startsAt,
    coachingEndsAt,
  }: CoachingEndCut): boolean {
    return coachingEndsAt === null || startsAt < coachingEndsAt;
  }

  private static proposedBy(
    party: CheckInParty,
    proposal: CheckInProposal,
  ): CheckIn {
    return new CheckIn({
      ...proposal,
      clientTimeZone: proposal.clientTimeZone.name,
      kind: "ad_hoc",
      recordedStatus: "pending",
      initiatedBy: party,
      proposedBy: party,
      note: proposal.note?.text ?? null,
      answeredAt: null,
      earlierStartsAt: null,
      moves: 0,
      newTimeNote: null,
    });
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

  hasPendingNewTime(): boolean {
    return this.recordedStatus === "pending" && this.wasMoved();
  }

  mayWithdraw(party: CheckInParty): boolean {
    return (
      this.recordedStatus === "pending" &&
      this.proposedBy === party &&
      !this.wasMoved()
    );
  }

  isWaitingRequestAt(at: Date): boolean {
    return (
      this.initiatedBy === "client" &&
      !this.wasMoved() &&
      this.statusAt(at) === "pending"
    );
  }

  isJoinableAt(now: Date): boolean {
    return this.statusAt(now) === "approved";
  }

  answerRefusalFor({ party, at }: PartyAtInstant): CheckInAnswerRefusal | null {
    return (
      this.pendingRefusalAt(at) ?? (this.awaits(party) ? null : "not_your_turn")
    );
  }

  withdrawalRefusalFor({
    party,
    at,
  }: PartyAtInstant): CheckInAnswerRefusal | null {
    return (
      this.pendingRefusalAt(at) ??
      (this.mayWithdraw(party) ? null : "not_your_turn")
    );
  }

  proposeNewTime(newTime: CheckInNewTime): ProposedNewTime {
    const refusal = this.proposalRefusalFor(newTime);

    if (refusal) {
      return { status: refusal };
    }

    return {
      status: "proposed",
      checkIn: new CheckIn({
        ...this.toProps(),
        startsAt: newTime.startsAt,
        clientTimeZone: newTime.clientTimeZone?.name ?? this.clientTimeZone,
        recordedStatus: "pending",
        proposedBy: newTime.party,
        answeredAt: null,
        earlierStartsAt: this.startsAt,
        moves: this.moves + 1,
        newTimeNote: newTime.note?.text ?? null,
      }),
    };
  }

  cancellationRefusalFor({
    party,
    at,
  }: PartyAtInstant): CheckInCancellationRefusal | null {
    if (this.recordedStatus !== "approved") {
      return "not_approved";
    }

    if (this.upcomingRefusalAt(at)) {
      return "expired";
    }

    return CHECK_IN_KIND_POLICIES[this.kind].mayCancelApproved(party)
      ? null
      : "not_allowed";
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
      viewerProposal: this.proposalOpenTo(viewer),
      viewerMayCancel: this.cancellationRefusalFor(viewer) === null,
    };
  }

  toSnapshot(): CheckInSnapshot {
    return {
      ...this.toProps(),
      endsAt: this.endsAt(),
      joinEmphasisFrom: this.joinEmphasisFrom(),
    };
  }

  private wasMoved(): boolean {
    return this.earlierStartsAt !== null;
  }

  private proposalRefusalFor(
    turn: PartyAtInstant,
  ): CheckInProposalRefusal | null {
    const refusal =
      this.recordedStatus === "approved"
        ? this.upcomingRefusalAt(turn.at)
        : this.answerRefusalFor(turn);

    if (refusal) {
      return refusal;
    }

    return this.moves < MAX_CHECK_IN_MOVES ? null : "moves_exhausted";
  }

  private proposalOpenTo(viewer: PartyAtInstant): CheckInViewerProposal {
    const refusal = this.proposalRefusalFor(viewer);

    if (refusal === null) {
      return "allowed";
    }

    return refusal === "moves_exhausted" ? "exhausted" : "none";
  }

  private upcomingRefusalAt(at: Date): "expired" | null {
    return this.startsAt <= at ? "expired" : null;
  }

  private pendingRefusalAt(at: Date): CheckInAnswerRefusal | null {
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
      earlierStartsAt: this.earlierStartsAt,
      moves: this.moves,
      newTimeNote: this.newTimeNote,
    };
  }
}
