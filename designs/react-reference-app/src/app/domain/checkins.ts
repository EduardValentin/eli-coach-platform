import { addMinutes, subMinutes } from 'date-fns';
import type { CoachingSubscription } from './coachingSubscription';
import { isBeforeStage, type ClientJourney } from './journey';
import { checkinInstant, toISODate } from '../utils/dateFormatters';

export type CheckinKind = 'recurring' | 'ad-hoc' | 'program-review';

export type CheckinParty = 'coach' | 'client';

export type RecordedCheckinStatus = 'pending' | 'approved' | 'cancelled' | 'clash';

export type CheckinStatus = RecordedCheckinStatus | 'passed';

export type CheckinTab = 'upcoming' | 'requests' | 'past';

export const MAX_RESCHEDULES = 2;

export const MOVES_EXHAUSTED_REASON = 'This check-in has already been moved twice.';

export const LATER_WEEK_REASON =
  'You can move only your next weekly check-in; your coach can move the later ones.';

export const CHECKIN_DURATION_MINUTES = 60;

export const JOIN_OPENS_MINUTES_BEFORE = 10;

export const CHECKIN_KIND_LABEL: Record<CheckinKind, string | null> = {
  recurring: null,
  'ad-hoc': 'Ad-hoc',
  'program-review': 'Program review',
};

export interface CheckIn {
  id: string;
  clientId: string;
  clientName: string;
  coachId: string;
  date: string;
  time: string;
  kind: CheckinKind;
  status: RecordedCheckinStatus;
  initiatedBy: CheckinParty;
  proposedBy: CheckinParty;
  createdAt: string;
  rescheduleCount: number;
  planId?: string;
  seriesId?: string;
  note?: string;
  previousDate?: string;
  previousTime?: string;
  newTimeNote?: string;
}

export type TimeSpan = { start: number; end: number };

const MINUTE_MS = 60 * 1000;

const HOLDING_STATUSES: readonly CheckinStatus[] = ['pending', 'approved'];

const COMING_UP_STATUSES: readonly CheckinStatus[] = ['pending', 'approved', 'clash'];

export function timeSpanFrom(start: Date, minutes: number): TimeSpan {
  return { start: start.getTime(), end: start.getTime() + minutes * MINUTE_MS };
}

export function spansOverlap(first: TimeSpan, second: TimeSpan): boolean {
  return first.start < second.end && second.start < first.end;
}

export function heldCheckinSpan(start: Date): TimeSpan {
  return timeSpanFrom(start, CHECKIN_DURATION_MINUTES);
}

export function holdsCoachTime(status: CheckinStatus): boolean {
  return HOLDING_STATUSES.includes(status);
}

export function isComingUp(status: CheckinStatus): boolean {
  return COMING_UP_STATUSES.includes(status);
}

export type CheckinClock = {
  now: Date;
  coachingEndsAt?: Date;
};

export function checkinStartsAt(checkin: CheckIn): Date {
  return checkinInstant(checkin.date, checkin.time);
}

function checkinEndsAt(checkin: CheckIn): Date {
  return addMinutes(checkinStartsAt(checkin), CHECKIN_DURATION_MINUTES);
}

function startsAfterCoachingEnds(checkin: CheckIn, coachingEndsAt?: Date) {
  return (
    coachingEndsAt !== undefined &&
    checkinStartsAt(checkin).getTime() >= coachingEndsAt.getTime()
  );
}

export function checkinStatus(
  checkin: CheckIn,
  { now, coachingEndsAt }: CheckinClock,
): CheckinStatus {
  if (checkin.status === 'cancelled') return 'cancelled';
  if (startsAfterCoachingEnds(checkin, coachingEndsAt)) return 'cancelled';

  const reachedItsStart = checkinStartsAt(checkin).getTime() <= now.getTime();
  if (checkin.status === 'pending') return reachedItsStart ? 'cancelled' : 'pending';
  if (checkin.status === 'clash') return reachedItsStart ? 'cancelled' : 'clash';

  return checkinEndsAt(checkin).getTime() <= now.getTime()
    ? 'passed'
    : 'approved';
}

export function isJoinable(checkin: CheckIn, now: Date): boolean {
  if (checkin.status !== 'approved') return false;

  const opensAt = subMinutes(checkinStartsAt(checkin), JOIN_OPENS_MINUTES_BEFORE);
  return (
    now.getTime() >= opensAt.getTime() &&
    now.getTime() < checkinEndsAt(checkin).getTime()
  );
}

export function previousSlot(checkin: CheckIn): Date | undefined {
  if (!checkin.previousDate || !checkin.previousTime) return undefined;

  return checkinInstant(checkin.previousDate, checkin.previousTime);
}

export function proposesNewTime(checkin: CheckIn): boolean {
  return checkin.status === 'pending' && previousSlot(checkin) !== undefined;
}

export type CheckinMove = {
  move: 'request' | 'new-time';
  by: CheckinParty;
};

export function latestMove(checkin: CheckIn): CheckinMove | null {
  if (proposesNewTime(checkin)) {
    return { move: 'new-time', by: checkin.proposedBy };
  }
  if (checkin.kind === 'ad-hoc') {
    return { move: 'request', by: checkin.initiatedBy };
  }

  return null;
}

export type CheckinNote = { text: string; by: CheckinParty };

export function checkinNote(checkin: CheckIn): CheckinNote | null {
  if (checkin.newTimeNote) {
    return { text: checkin.newTimeNote, by: checkin.proposedBy };
  }
  if (checkin.note) return { text: checkin.note, by: checkin.initiatedBy };

  return null;
}

export function awaitsResponseFrom(checkin: CheckIn): CheckinParty {
  if (checkin.status === 'clash') return 'coach';

  return checkin.proposedBy === 'coach' ? 'client' : 'coach';
}

export function checkinTabFor(status: CheckinStatus, party: CheckinParty): CheckinTab {
  if (status === 'approved') return 'upcoming';
  if (status === 'pending') return 'requests';
  if (status === 'clash') return party === 'coach' ? 'requests' : 'upcoming';

  return 'past';
}

export type CheckinProposal = 'allowed' | 'exhausted' | 'later_week' | 'none';

function mayAnswerWithNewTime(checkin: CheckIn, party: CheckinParty): boolean {
  if (checkin.status === 'approved') return true;
  if (checkin.status === 'clash') return party === 'coach';

  return checkin.status === 'pending' && awaitsResponseFrom(checkin) === party;
}

export function proposalFor(checkin: CheckIn, party: CheckinParty): CheckinProposal {
  if (!mayAnswerWithNewTime(checkin, party)) return 'none';
  if (checkin.status === 'clash') return 'allowed';

  return checkin.rescheduleCount < MAX_RESCHEDULES ? 'allowed' : 'exhausted';
}

function followsAnUpcomingWeek(checkin: CheckIn, clientUpcoming: readonly CheckIn[]): boolean {
  return clientUpcoming.some(
    (other) =>
      other.seriesId === checkin.seriesId &&
      checkinStartsAt(other) < checkinStartsAt(checkin),
  );
}

export function clientProposalAmong(
  checkin: CheckIn,
  clientUpcoming: readonly CheckIn[],
): CheckinProposal {
  const proposal = proposalFor(checkin, 'client');
  if (proposal === 'none' || !checkin.seriesId) return proposal;

  return followsAnUpcomingWeek(checkin, clientUpcoming) ? 'later_week' : proposal;
}

export type NewTime = {
  slot: Pick<CheckIn, 'date' | 'time'>;
  party: CheckinParty;
  note?: string;
};

export function withProposedTime(checkin: CheckIn, { slot, party, note }: NewTime): CheckIn {
  const spendsAMove = checkin.status !== 'clash';

  return {
    ...checkin,
    ...slot,
    status: 'pending',
    proposedBy: party,
    previousDate: checkin.date,
    previousTime: checkin.time,
    rescheduleCount: spendsAMove ? checkin.rescheduleCount + 1 : checkin.rescheduleCount,
    newTimeNote: note,
  };
}

export function canProposeFor(checkin: CheckIn, party: CheckinParty): boolean {
  return proposalFor(checkin, party) === 'allowed';
}

export function canWithdrawRequest(
  checkin: CheckIn,
  party: CheckinParty,
): boolean {
  return (
    checkin.status === 'pending' &&
    checkin.proposedBy === party &&
    !proposesNewTime(checkin)
  );
}

export function canCancelApproved(
  checkin: CheckIn,
  party: CheckinParty,
): boolean {
  if (checkin.status === 'clash') return party === 'coach';
  if (checkin.status !== 'approved') return false;
  if (checkin.kind === 'ad-hoc') return party === checkin.initiatedBy;

  return party === 'coach' && checkin.kind === 'recurring';
}

export function isOpenClientRequest(
  checkin: CheckIn,
  clock: CheckinClock,
): boolean {
  return (
    checkin.kind === 'ad-hoc' &&
    checkin.initiatedBy === 'client' &&
    previousSlot(checkin) === undefined &&
    checkinStatus(checkin, clock) === 'pending'
  );
}

export function coachingEndsAt(
  subscription: CoachingSubscription | undefined,
): Date | undefined {
  if (!subscription) return undefined;
  if (subscription.status !== 'cancelled' && subscription.status !== 'ended') {
    return undefined;
  }

  return subscription.periodEndsAt;
}

export type CheckinScheduling = 'allowed' | 'awaiting_onboarding' | 'ended';

export function checkinSchedulingFor(journey: ClientJourney, now: Date): CheckinScheduling {
  const endsAt = coachingEndsAt(journey.subscription);
  if (endsAt && now.getTime() >= endsAt.getTime()) return 'ended';
  if (isBeforeStage(journey.stage, 'submitted')) return 'awaiting_onboarding';

  return 'allowed';
}

function toTime24(instant: Date): string {
  const hours = String(instant.getHours()).padStart(2, '0');
  const minutes = String(instant.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function checkinSlotAt(instant: Date): Pick<CheckIn, 'date' | 'time'> {
  return { date: toISODate(instant), time: toTime24(instant) };
}

export function programReviewCheckin(
  journey: ClientJourney,
  client: { id: string; name: string },
): CheckIn | null {
  const { reviewCall } = journey;
  if (!reviewCall) return null;

  const { rescheduledFrom } = reviewCall;

  return {
    id: `review-${journey.callId}`,
    clientId: client.id,
    clientName: client.name,
    coachId: 'coach-1',
    ...checkinSlotAt(reviewCall.startsAt),
    kind: 'program-review',
    status: 'approved',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: reviewCall.scheduledAt.toISOString(),
    rescheduleCount: rescheduledFrom ? 1 : 0,
    previousDate: rescheduledFrom ? checkinSlotAt(rescheduledFrom).date : undefined,
    previousTime: rescheduledFrom ? checkinSlotAt(rescheduledFrom).time : undefined,
  };
}
