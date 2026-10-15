import { CHECK_IN_KIND_POLICIES, type CheckInKind } from "./check-in-kind";
import type { CheckInNote } from "./check-in-note";
import type { CheckInParty } from "./check-in-party";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInTimeZone } from "./check-in-time-zone";

export const RECORDED_CHECK_IN_STATUSES = [
  "pending",
  "approved",
  "cancelled",
  "clash",
] as const;

export type RecordedCheckInStatus = (typeof RECORDED_CHECK_IN_STATUSES)[number];

const COACH_TIME_HOLDING_STATUSES: readonly RecordedCheckInStatus[] = [
  "pending",
  "approved",
];

export const OPEN_CHECK_IN_STATUSES: readonly RecordedCheckInStatus[] = [
  ...COACH_TIME_HOLDING_STATUSES,
  "clash",
];

export const UNANSWERED_CHECK_IN_STATUSES: readonly RecordedCheckInStatus[] = [
  "pending",
  "clash",
];
export type CheckInStatus = RecordedCheckInStatus | "passed";
export type CheckInOutcome = Exclude<
  RecordedCheckInStatus,
  "pending" | "clash"
>;
export type CheckInAnswerRefusal = "not_pending" | "expired" | "not_your_turn";
export type CheckInProposalRefusal = CheckInAnswerRefusal | "moves_exhausted";
export type CheckInLaterWeekRefusal = "not_next_weekly";
export type CheckInCancellationRefusal =
  "not_approved" | "expired" | "not_allowed";
export type CheckInRefusal =
  CheckInProposalRefusal | CheckInCancellationRefusal;
export type CheckInRequestDecision =
  "requested" | "request_waiting" | "time_taken";
export type CheckInViewerProposal =
  "allowed" | "exhausted" | "later_week" | "none";
export type CheckInTab = "upcoming" | "requests" | "past";
export type CheckInLapseKind =
  "request_expired" | "new_time_expired" | "clash_missed";
export type CheckInLapseSnapshot = { kind: CheckInLapseKind; lapsedAt: Date };

export class CheckInLapse {
  readonly kind: CheckInLapseKind;
  readonly lapsedAt: Date;

  private constructor(snapshot: CheckInLapseSnapshot) {
    this.kind = snapshot.kind;
    this.lapsedAt = snapshot.lapsedAt;
  }

  static at(snapshot: CheckInLapseSnapshot): CheckInLapse {
    return new CheckInLapse(snapshot);
  }

  toSnapshot(): CheckInLapseSnapshot {
    return { kind: this.kind, lapsedAt: this.lapsedAt };
  }
}

export type CheckInProps = {
  id: string;
  seriesId: string | null;
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
  tab: CheckInTab;
  awaitsViewer: boolean;
  viewerMayWithdraw: boolean;
  isWaitingRequest: boolean;
  viewerProposal: CheckInViewerProposal;
  viewerMayCancel: boolean;
  newTimeWaits: boolean;
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

type SeriesOccurrence = {
  id: string;
  seriesId: string;
  clientId: string;
  startsAt: Date;
  clientTimeZone: string;
  coachTimeZone: string;
  at: Date;
};

type LearnedOccurrence = {
  occurrence: CheckIn;
  availability: "open" | "closed";
  coachTime: "reserved" | "taken" | "not_attempted";
};

type PartyAtInstant = { party: CheckInParty; at: Date };

type ClientCheckInsTurn = PartyAtInstant & {
  clientCheckIns: readonly CheckIn[];
};

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

const TAB_OF_STATUS: Record<Exclude<CheckInStatus, "clash">, CheckInTab> = {
  approved: "upcoming",
  pending: "requests",
  passed: "past",
  cancelled: "past",
};

export class CheckIn {
  readonly id: string;
  readonly seriesId: string | null;
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
    this.seriesId = props.seriesId;
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

  static seriesOccurrence(occurrence: SeriesOccurrence): CheckIn {
    const recordedStatus = CHECK_IN_KIND_POLICIES.recurring.initialStatus();

    return new CheckIn({
      id: occurrence.id,
      seriesId: occurrence.seriesId,
      clientId: occurrence.clientId,
      startsAt: occurrence.startsAt,
      clientTimeZone: occurrence.clientTimeZone,
      coachTimeZone: occurrence.coachTimeZone,
      kind: "recurring",
      recordedStatus,
      initiatedBy: "coach",
      proposedBy: "coach",
      note: null,
      requestedAt: occurrence.at,
      answeredAt: recordedStatus === "approved" ? occurrence.at : null,
      earlierStartsAt: null,
      moves: 0,
      newTimeNote: null,
    });
  }

  static decideOccurrence({
    occurrence,
    availability,
    coachTime,
  }: LearnedOccurrence): CheckIn {
    return availability === "open" && coachTime === "reserved"
      ? occurrence
      : occurrence.asClash();
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

  static byStart(a: CheckIn, b: CheckIn): number {
    return a.startsAt.getTime() - b.startsAt.getTime();
  }

  static earliestOf(checkIns: readonly CheckIn[]): CheckIn | null {
    return [...checkIns].sort(CheckIn.byStart)[0] ?? null;
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
      seriesId: null,
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

  asClash(): CheckIn {
    return new CheckIn({ ...this.toProps(), recordedStatus: "clash" });
  }

  statusAt(now: Date): CheckInStatus {
    if (this.holdsNoAnswerYet() && this.startsAt <= now) {
      return "cancelled";
    }

    if (this.recordedStatus === "approved" && this.endsAt() <= now) {
      return "passed";
    }

    return this.recordedStatus;
  }

  isClash(): boolean {
    return this.recordedStatus === "clash";
  }

  lapseAt(now: Date): CheckInLapse | null {
    const kind = this.unansweredLapse();

    if (!kind || this.startsAt > now) {
      return null;
    }

    return CheckInLapse.at({ kind, lapsedAt: this.startsAt });
  }

  holdsCoachTimeAt(at: Date): boolean {
    const status = this.statusAt(at);

    return COACH_TIME_HOLDING_STATUSES.some((holding) => holding === status);
  }

  isFor(clientId: string): boolean {
    return this.clientId === clientId;
  }

  awaitsAnswerOf({ party, at }: PartyAtInstant): boolean {
    const status = this.statusAt(at);

    if (status === "clash") {
      return party === "coach";
    }

    return status === "pending" && this.proposedBy !== party;
  }

  tabFor({ party, at }: PartyAtInstant): CheckInTab {
    const status = this.statusAt(at);

    if (status === "clash") {
      return party === "coach" ? "requests" : "upcoming";
    }

    return TAB_OF_STATUS[status];
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
      this.pendingRefusalAt(at) ??
      (this.awaitsAnswerOf({ party, at }) ? null : "not_your_turn")
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
        moves: this.recordedStatus === "clash" ? this.moves : this.moves + 1,
        newTimeNote: newTime.note?.text ?? null,
      }),
    };
  }

  laterWeekRefusalFor({
    clientCheckIns,
    ...turn
  }: ClientCheckInsTurn): CheckInLaterWeekRefusal | null {
    if (turn.party === "coach" || !this.isUpcomingWeekFor(turn)) {
      return null;
    }

    const followsUpcomingWeek = clientCheckIns.some(
      (other) =>
        other.seriesId === this.seriesId &&
        other.startsAt < this.startsAt &&
        other.isUpcomingWeekFor(turn),
    );

    return followsUpcomingWeek ? "not_next_weekly" : null;
  }

  cancellationRefusalFor({
    party,
    at,
  }: PartyAtInstant): CheckInCancellationRefusal | null {
    if (this.recordedStatus !== "approved" && this.recordedStatus !== "clash") {
      return "not_approved";
    }

    if (this.upcomingRefusalAt(at)) {
      return "expired";
    }

    return this.mayCancel(party) ? null : "not_allowed";
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
      tab: this.tabFor(viewer),
      awaitsViewer: this.awaitsAnswerOf(viewer),
      viewerMayWithdraw: this.withdrawalRefusalFor(viewer) === null,
      isWaitingRequest: this.isWaitingRequestAt(viewer.at),
      viewerProposal: this.proposalOpenTo(viewer),
      viewerMayCancel: this.cancellationRefusalFor(viewer) === null,
      newTimeWaits: this.statusAt(viewer.at) === "pending" && this.wasMoved(),
    };
  }

  viewAmong({ clientCheckIns, ...viewer }: ClientCheckInsTurn): CheckInView {
    const view = this.viewFor(viewer);
    const laterWeek = this.laterWeekRefusalFor({ ...viewer, clientCheckIns });

    return view.viewerProposal === "none" || laterWeek === null
      ? view
      : { ...view, viewerProposal: "later_week" };
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

  private unansweredLapse(): CheckInLapseKind | null {
    if (this.recordedStatus === "clash") {
      return "clash_missed";
    }

    if (this.recordedStatus !== "pending") {
      return null;
    }

    return this.wasMoved() ? "new_time_expired" : "request_expired";
  }

  private isUpcomingWeekFor(viewer: PartyAtInstant): boolean {
    return this.seriesId !== null && this.tabFor(viewer) === "upcoming";
  }

  private holdsNoAnswerYet(): boolean {
    return UNANSWERED_CHECK_IN_STATUSES.includes(this.recordedStatus);
  }

  private mayCancel(party: CheckInParty): boolean {
    return this.recordedStatus === "clash"
      ? party === "coach"
      : CHECK_IN_KIND_POLICIES[this.kind].mayCancelApproved({
          party,
          initiatedBy: this.initiatedBy,
        });
  }

  private proposalRefusalFor(
    turn: PartyAtInstant,
  ): CheckInProposalRefusal | null {
    if (this.recordedStatus === "clash") {
      return this.clashProposalRefusalFor(turn);
    }

    const refusal =
      this.recordedStatus === "approved"
        ? this.upcomingRefusalAt(turn.at)
        : this.answerRefusalFor(turn);

    if (refusal) {
      return refusal;
    }

    return this.moves < MAX_CHECK_IN_MOVES ? null : "moves_exhausted";
  }

  private clashProposalRefusalFor({
    party,
    at,
  }: PartyAtInstant): CheckInProposalRefusal | null {
    return (
      this.upcomingRefusalAt(at) ?? (party === "coach" ? null : "not_your_turn")
    );
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
      seriesId: this.seriesId,
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
