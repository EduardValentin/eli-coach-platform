import { describe, expect, it } from 'vitest';
import {
  MOVES_EXHAUSTED_REASON,
  canCancelApproved,
  canProposeFor,
  awaitsResponseFrom,
  canWithdrawRequest,
  clientProposalAmong,
  checkinNote,
  checkinTabFor,
  checkinSchedulingFor,
  checkinSlotAt,
  checkinStartsAt,
  checkinStatus,
  coachingEndsAt,
  heldCheckinSpan,
  holdsCoachTime,
  spansOverlap,
  timeSpanFrom,
  isComingUp,
  isJoinable,
  isOpenClientRequest,
  latestMove,
  programReviewCheckin,
  proposalFor,
  proposesNewTime,
  withProposedTime,
  type CheckIn,
  type CheckinParty,
  type CheckinStatus,
  type CheckinTab,
} from './checkins';
import type { CoachingSubscription } from './coachingSubscription';
import type { ClientJourney } from './journey';

const NOW = new Date(2026, 9, 14, 10, 30);

function checkin(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: 'ck-test',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: '2026-10-16',
    time: '10:00',
    kind: 'recurring',
    status: 'approved',
    initiatedBy: 'coach',
    proposedBy: 'coach',
    createdAt: '2026-10-01T09:00:00.000Z',
    rescheduleCount: 0,
    ...overrides,
  };
}

function subscription(
  overrides: Partial<CoachingSubscription>,
): CoachingSubscription {
  return {
    bundle: 1,
    startPath: 'immediate',
    purchasedAt: new Date(2026, 8, 1),
    amountPaidCents: 14900,
    status: 'active',
    paymentProblem: false,
    ...overrides,
  };
}

describe('the status of a check-in', () => {
  it('is approved before an approved check-in ends', () => {
    // arrange
    const live = checkin({ date: '2026-10-14', time: '10:00' });

    // act
    const status = checkinStatus(live, { now: NOW });

    // assert
    expect(status).toBe('approved');
  });

  it('is passed once an approved check-in has ended', () => {
    // arrange
    const finished = checkin({ date: '2026-10-14', time: '09:00' });

    // act
    const status = checkinStatus(finished, { now: NOW });

    // assert
    expect(status).toBe('passed');
  });

  it('stays pending while the proposed time is still ahead', () => {
    // arrange
    const request = checkin({ kind: 'ad-hoc', status: 'pending' });

    // act
    const status = checkinStatus(request, { now: NOW });

    // assert
    expect(status).toBe('pending');
  });

  it('is cancelled when a request reaches its proposed time unanswered', () => {
    // arrange
    const unanswered = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      date: '2026-10-14',
      time: '10:00',
    });

    // act
    const status = checkinStatus(unanswered, { now: NOW });

    // assert
    expect(status).toBe('cancelled');
  });

  it('is cancelled when it starts after the coaching ends', () => {
    // arrange
    const afterEnd = checkin({ date: '2026-10-20' });

    // act
    const status = checkinStatus(afterEnd, {
      now: NOW,
      coachingEndsAt: new Date(2026, 9, 18),
    });

    // assert
    expect(status).toBe('cancelled');
  });

  it('keeps a check-in before the coaching ends', () => {
    // arrange
    const beforeEnd = checkin({ date: '2026-10-16' });

    // act
    const status = checkinStatus(beforeEnd, {
      now: NOW,
      coachingEndsAt: new Date(2026, 9, 18),
    });

    // assert
    expect(status).toBe('approved');
  });
});

describe('when coaching ends', () => {
  it('has no end while the subscription is active', () => {
    // arrange
    const active = subscription({ periodEndsAt: new Date(2026, 9, 1) });

    // act
    const endsAt = coachingEndsAt(active);

    // assert
    expect(endsAt).toBeUndefined();
  });

  it('ends at the paid period end once the subscription is cancelled', () => {
    // arrange
    const periodEndsAt = new Date(2026, 9, 31);
    const cancelled = subscription({ status: 'cancelled', periodEndsAt });

    // act
    const endsAt = coachingEndsAt(cancelled);

    // assert
    expect(endsAt).toEqual(periodEndsAt);
  });
});

describe('whether the coach can schedule a check-in for a client', () => {
  function journeyAt(
    stage: ClientJourney['stage'],
    coaching: Partial<CoachingSubscription> = {},
  ): ClientJourney {
    return { stage, subscription: subscription(coaching) } as ClientJourney;
  }

  it('allows it once she has sent her onboarding', () => {
    // arrange
    const journey = journeyAt('submitted');

    // act
    const scheduling = checkinSchedulingFor(journey, NOW);

    // assert
    expect(scheduling).toBe('allowed');
  });

  it('waits for her onboarding before she has sent it', () => {
    // arrange
    const journey = journeyAt('onboarding');

    // act
    const scheduling = checkinSchedulingFor(journey, NOW);

    // assert
    expect(scheduling).toBe('awaiting_onboarding');
  });

  it('still allows it while a cancelled coaching keeps her access', () => {
    // arrange
    const journey = journeyAt('submitted', {
      status: 'cancelled',
      periodEndsAt: new Date(2026, 9, 31),
    });

    // act
    const scheduling = checkinSchedulingFor(journey, NOW);

    // assert
    expect(scheduling).toBe('allowed');
  });

  it('ends once her coaching has ended, even before she sent her onboarding', () => {
    // arrange
    const journey = journeyAt('onboarding', { status: 'ended', periodEndsAt: NOW });

    // act
    const scheduling = checkinSchedulingFor(journey, NOW);

    // assert
    expect(scheduling).toBe('ended');
  });
});

describe('joining a check-in', () => {
  it('opens ten minutes before the start', () => {
    // arrange
    const soon = checkin({ date: '2026-10-14', time: '10:40' });

    // act
    const joinable = isJoinable(soon, NOW);

    // assert
    expect(joinable).toBe(true);
  });

  it('is not open earlier than ten minutes before the start', () => {
    // arrange
    const later = checkin({ date: '2026-10-14', time: '11:00' });

    // act
    const joinable = isJoinable(later, NOW);

    // assert
    expect(joinable).toBe(false);
  });

  it('is not open for a check-in that is still pending', () => {
    // arrange
    const pending = checkin({ status: 'pending', date: '2026-10-14', time: '10:30' });

    // act
    const joinable = isJoinable(pending, NOW);

    // assert
    expect(joinable).toBe(false);
  });
});

describe('proposing and withdrawing', () => {
  it('treats a pending check-in with an earlier time as a new time proposal', () => {
    // arrange
    const moved = checkin({
      status: 'pending',
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const proposal = proposesNewTime(moved);

    // assert
    expect(proposal).toBe(true);
  });

  it('lets the proposer withdraw a new request', () => {
    // arrange
    const request = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
    });

    // act
    const allowed = canWithdrawRequest(request, 'client');

    // assert
    expect(allowed).toBe(true);
  });

  it('does not let the other party withdraw a request', () => {
    // arrange
    const request = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
    });

    // act
    const allowed = canWithdrawRequest(request, 'coach');

    // assert
    expect(allowed).toBe(false);
  });
});

describe('proposing a new time', () => {
  it.each(['coach', 'client'] as const)('lets the %s propose one for an approved check-in', (party) => {
    // arrange
    const approved = checkin({ status: 'approved' });

    // act
    const allowed = canProposeFor(approved, party);

    // assert
    expect(allowed).toBe(true);
  });

  it('lets the party a request waits for answer it with a new time', () => {
    // arrange
    const request = checkin({ kind: 'ad-hoc', status: 'pending', initiatedBy: 'client', proposedBy: 'client' });

    // act
    const allowed = canProposeFor(request, 'coach');

    // assert
    expect(allowed).toBe(true);
  });

  it('never lets the proposer move her own waiting request', () => {
    // arrange
    const request = checkin({ kind: 'ad-hoc', status: 'pending', initiatedBy: 'client', proposedBy: 'client' });

    // act
    const allowed = canProposeFor(request, 'client');

    // assert
    expect(allowed).toBe(false);
  });

  it('never lets the proposer move her own waiting new time', () => {
    // arrange
    const moved = checkin({
      status: 'pending',
      proposedBy: 'coach',
      rescheduleCount: 1,
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const allowed = canProposeFor(moved, 'coach');

    // assert
    expect(allowed).toBe(false);
  });

  it('does not offer a new time for a cancelled check-in', () => {
    // arrange
    const cancelled = checkin({ status: 'cancelled' });

    // act
    const proposal = proposalFor(cancelled, 'coach');

    // assert
    expect(proposal).toBe('none');
  });

  it('stops new times once a check-in has been moved twice', () => {
    // arrange
    const exhausted = checkin({ rescheduleCount: 2 });

    // act
    const allowed = canProposeFor(exhausted, 'client');

    // assert
    expect(allowed).toBe(false);
  });

  it('marks a check-in moved twice as exhausted for a party who could otherwise propose', () => {
    // arrange
    const exhausted = checkin({ rescheduleCount: 2 });

    // act
    const proposal = proposalFor(exhausted, 'coach');

    // assert
    expect(proposal).toBe('exhausted');
  });

  it('still allows a second new time after the first', () => {
    // arrange
    const movedOnce = checkin({ rescheduleCount: 1 });

    // act
    const proposal = proposalFor(movedOnce, 'client');

    // assert
    expect(proposal).toBe('allowed');
  });

  it('explains why a third new time is not offered', () => {
    // arrange
    // act
    const reason = MOVES_EXHAUSTED_REASON;

    // assert
    expect(reason).toBe('This check-in has already been moved twice.');
  });
});

describe('withdrawing a moved check-in', () => {
  it('does not let the proposer take back a new time', () => {
    // arrange
    const moved = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
      rescheduleCount: 1,
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const allowed = canWithdrawRequest(moved, 'client');

    // assert
    expect(allowed).toBe(false);
  });
});

describe('cancelling an approved check-in', () => {
  it('lets the coach cancel a recurring check-in', () => {
    // arrange
    const recurring = checkin({ kind: 'recurring' });

    // act
    const allowed = canCancelApproved(recurring, 'coach');

    // assert
    expect(allowed).toBe(true);
  });

  it('lets only the client cancel an ad-hoc check-in she requested', () => {
    // arrange
    const requested = checkin({ kind: 'ad-hoc', initiatedBy: 'client', proposedBy: 'client' });

    // act
    const allowed = [
      canCancelApproved(requested, 'client'),
      canCancelApproved(requested, 'coach'),
    ];

    // assert
    expect(allowed).toEqual([true, false]);
  });

  it('lets only the coach cancel an ad-hoc check-in she scheduled', () => {
    // arrange
    const scheduled = checkin({ kind: 'ad-hoc', initiatedBy: 'coach', proposedBy: 'coach' });

    // act
    const allowed = [
      canCancelApproved(scheduled, 'coach'),
      canCancelApproved(scheduled, 'client'),
    ];

    // assert
    expect(allowed).toEqual([true, false]);
  });

  it('does not let the client cancel a recurring check-in', () => {
    // arrange
    const recurring = checkin({ kind: 'recurring' });

    // act
    const allowed = canCancelApproved(recurring, 'client');

    // assert
    expect(allowed).toBe(false);
  });

  it('does not let either party cancel a program review', () => {
    // arrange
    const review = checkin({ kind: 'program-review' });

    // act
    const allowed = [
      canCancelApproved(review, 'coach'),
      canCancelApproved(review, 'client'),
    ];

    // assert
    expect(allowed).toEqual([false, false]);
  });
});

describe('the client request limit', () => {
  it('counts a pending ad-hoc request the client sent', () => {
    // arrange
    const request = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
    });

    // act
    const open = isOpenClientRequest(request, { now: NOW });

    // assert
    expect(open).toBe(true);
  });

  it('ignores a new time the coach proposed for a recurring check-in', () => {
    // arrange
    const moved = checkin({
      kind: 'recurring',
      status: 'pending',
      initiatedBy: 'coach',
      proposedBy: 'coach',
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const open = isOpenClientRequest(moved, { now: NOW });

    // assert
    expect(open).toBe(false);
  });

  it('ignores her own request once it has been moved', () => {
    // arrange
    const moved = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
      rescheduleCount: 1,
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const open = isOpenClientRequest(moved, { now: NOW });

    // assert
    expect(open).toBe(false);
  });

  it('frees the client once her request went unanswered past its time', () => {
    // arrange
    const unanswered = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
      date: '2026-10-13',
    });

    // act
    const open = isOpenClientRequest(unanswered, { now: NOW });

    // assert
    expect(open).toBe(false);
  });
});

describe('the program review as a check-in', () => {
  const client = { id: 'c1', name: 'Jane Doe' };

  it('is absent until the review call is booked', () => {
    // arrange
    const journey = { callId: 'ac-1' } as ClientJourney;

    // act
    const review = programReviewCheckin(journey, client);

    // assert
    expect(review).toBeNull();
  });

  it('is an approved program review at the booked time', () => {
    // arrange
    const journey = {
      callId: 'ac-1',
      reviewCall: {
        startsAt: new Date(2026, 9, 16, 18, 0),
        scheduledAt: new Date(2026, 9, 12, 9, 0),
      },
    } as ClientJourney;

    // act
    const review = programReviewCheckin(journey, client);

    // assert
    expect(review).toMatchObject({
      kind: 'program-review',
      status: 'approved',
      date: '2026-10-16',
      time: '18:00',
      rescheduleCount: 0,
    });
  });

  it('remembers the earlier time once the client moved it', () => {
    // arrange
    const journey = {
      callId: 'ac-1',
      reviewCall: {
        startsAt: new Date(2026, 9, 17, 18, 0),
        scheduledAt: new Date(2026, 9, 13, 9, 0),
        rescheduledFrom: new Date(2026, 9, 16, 18, 0),
      },
    } as ClientJourney;

    // act
    const review = programReviewCheckin(journey, client);

    // assert
    expect(review).toMatchObject({
      previousDate: '2026-10-16',
      previousTime: '18:00',
      rescheduleCount: 1,
    });
  });
});

describe('the latest move on a check-in', () => {
  it('is the request of whoever asked for an ad-hoc check-in', () => {
    // arrange
    const request = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'client',
    });

    // act
    const move = latestMove(request);

    // assert
    expect(move).toEqual({ move: 'request', by: 'client' });
  });

  it('is the new time of whoever proposed it', () => {
    // arrange
    const countered = checkin({
      kind: 'ad-hoc',
      status: 'pending',
      initiatedBy: 'client',
      proposedBy: 'coach',
      previousDate: '2026-10-15',
      previousTime: '10:00',
    });

    // act
    const move = latestMove(countered);

    // assert
    expect(move).toEqual({ move: 'new-time', by: 'coach' });
  });

  it('is nothing for a recurring check-in without a new time', () => {
    // arrange
    const recurring = checkin({ kind: 'recurring' });

    // act
    const move = latestMove(recurring);

    // assert
    expect(move).toBeNull();
  });
});

describe('the note on a check-in', () => {
  it('belongs to whoever proposed the new time it came with', () => {
    // arrange
    const countered = checkin({
      initiatedBy: 'client',
      proposedBy: 'coach',
      note: 'Questions about macros',
      newTimeNote: 'Thursday suits me better',
    });

    // act
    const note = checkinNote(countered);

    // assert
    expect(note).toEqual({ text: 'Thursday suits me better', by: 'coach' });
  });

  it('belongs to whoever asked for the check-in otherwise', () => {
    // arrange
    const countered = checkin({
      initiatedBy: 'client',
      proposedBy: 'coach',
      note: 'Questions about macros',
    });

    // act
    const note = checkinNote(countered);

    // assert
    expect(note).toEqual({ text: 'Questions about macros', by: 'client' });
  });
});

describe('the slot a picked time lands on', () => {
  it('records the picked instant as the browser-zone date and time it starts at', () => {
    // arrange
    const picked = new Date(2026, 9, 16, 17, 0);

    // act
    const slot = checkinSlotAt(picked);

    // assert
    expect(slot).toEqual({ date: '2026-10-16', time: '17:00' });
  });

  it('starts the check-in at the instant that was picked', () => {
    // arrange
    const picked = new Date(2026, 9, 16, 9, 0);

    // act
    const startsAt = checkinStartsAt(checkin(checkinSlotAt(picked)));

    // assert
    expect(startsAt.getTime()).toBe(picked.getTime());
  });
});

describe('the coach time a check-in holds', () => {
  it.each([
    ['pending', true],
    ['approved', true],
    ['passed', false],
    ['cancelled', false],
  ] as const)('holds the coach time while %s: %s', (status, holds) => {
    // arrange
    // act
    const held = holdsCoachTime(status);

    // assert
    expect(held).toBe(holds);
  });

  it('holds the whole hour from its start', () => {
    // arrange
    const start = new Date('2026-03-02T15:00:00.000Z');

    // act
    const span = heldCheckinSpan(start);

    // assert
    expect(span).toEqual(timeSpanFrom(start, 60));
  });

  it('overlaps a span that starts before it ends', () => {
    // arrange
    const held = heldCheckinSpan(new Date('2026-03-02T15:00:00.000Z'));

    // act
    const overlapping = spansOverlap(held, timeSpanFrom(new Date('2026-03-02T15:59:00.000Z'), 30));
    const touching = spansOverlap(held, timeSpanFrom(new Date('2026-03-02T16:00:00.000Z'), 30));

    // assert
    expect(overlapping).toBe(true);
    expect(touching).toBe(false);
  });
});

describe('a weekly check-in whose hour is taken', () => {
  const clash = () => checkin({ status: 'clash', seriesId: 'series-1', rescheduleCount: 1 });

  it('stays a clash until its start, then reads as cancelled', () => {
    // arrange
    const startsAt = checkinStartsAt(clash());

    // act
    const before = checkinStatus(clash(), { now: new Date(startsAt.getTime() - 60_000) });
    const atItsStart = checkinStatus(clash(), { now: startsAt });

    // assert
    expect(before).toBe('clash');
    expect(atItsStart).toBe('cancelled');
  });

  it('holds no coach time but is still to come', () => {
    // arrange
    const status: CheckinStatus = 'clash';

    // act
    const held = holdsCoachTime(status);
    const comingUp = isComingUp(status);

    // assert
    expect(held).toBe(false);
    expect(comingUp).toBe(true);
  });

  it('waits for the coach', () => {
    // arrange
    // act
    const awaited = awaitsResponseFrom(clash());

    // assert
    expect(awaited).toBe('coach');
  });

  it('lets the coach give it a new time without spending a move', () => {
    // arrange
    const taken = clash();

    // act
    const coachProposal = proposalFor(checkin({ ...taken, rescheduleCount: 2 }), 'coach');
    const clientProposal = proposalFor(taken, 'client');
    const moved = withProposedTime(taken, {
      slot: { date: '2026-10-17', time: '11:00' },
      party: 'coach',
    });

    // assert
    expect(coachProposal).toBe('allowed');
    expect(clientProposal).toBe('none');
    expect(moved).toMatchObject({
      status: 'pending',
      proposedBy: 'coach',
      date: '2026-10-17',
      time: '11:00',
      previousDate: taken.date,
      previousTime: taken.time,
      rescheduleCount: 1,
    });
  });

  it('lets only the coach cancel it', () => {
    // arrange
    // act
    const byCoach = canCancelApproved(clash(), 'coach');
    const byClient = canCancelApproved(clash(), 'client');

    // assert
    expect(byCoach).toBe(true);
    expect(byClient).toBe(false);
  });
});

describe('moving an approved check-in', () => {
  it('spends one of the two moves', () => {
    // arrange
    const approved = checkin({ status: 'approved', rescheduleCount: 0 });

    // act
    const moved = withProposedTime(approved, {
      slot: { date: '2026-10-17', time: '11:00' },
      party: 'client',
      note: 'Friday suits me better.',
    });

    // assert
    expect(moved).toMatchObject({ status: 'pending', proposedBy: 'client', rescheduleCount: 1, newTimeNote: 'Friday suits me better.' });
  });
});

describe('the tab a check-in is listed under', () => {
  it.each<[CheckinStatus, CheckinParty, CheckinTab]>([
    ['approved', 'coach', 'upcoming'],
    ['approved', 'client', 'upcoming'],
    ['pending', 'coach', 'requests'],
    ['pending', 'client', 'requests'],
    ['clash', 'coach', 'requests'],
    ['clash', 'client', 'upcoming'],
    ['passed', 'coach', 'past'],
    ['cancelled', 'client', 'past'],
  ])('lists %s under the tab it belongs to for the %s', (status, party, tab) => {
    // arrange
    // act
    const listedUnder = checkinTabFor(status, party);

    // assert
    expect(listedUnder).toBe(tab);
  });
});

describe('moving a weekly check-in from her Upcoming', () => {
  const soonestWeek = checkin({ id: 'week-1', seriesId: 'series-1', date: '2026-10-21', time: '18:00' });
  const laterWeek = checkin({ id: 'week-2', seriesId: 'series-1', date: '2026-10-28', time: '18:00' });
  const single = checkin({ id: 'single', kind: 'ad-hoc', date: '2026-10-29', time: '10:00' });
  const upcoming = [soonestWeek, laterWeek, single];

  it('lets her move her next weekly check-in', () => {
    // arrange
    // act
    const proposal = clientProposalAmong(soonestWeek, upcoming);

    // assert
    expect(proposal).toBe('allowed');
  });

  it('holds back a later week of the same series', () => {
    // arrange
    // act
    const proposal = clientProposalAmong(laterWeek, upcoming);

    // assert
    expect(proposal).toBe('later_week');
  });

  it('leaves a single check-in to its own moves', () => {
    // arrange
    // act
    const proposal = clientProposalAmong(single, upcoming);

    // assert
    expect(proposal).toBe('allowed');
  });

  it('offers nothing on a later week she could not move anyway', () => {
    // arrange
    const clashingLaterWeek = { ...laterWeek, status: 'clash' as const };

    // act
    const proposal = clientProposalAmong(clashingLaterWeek, upcoming);

    // assert
    expect(proposal).toBe('none');
  });
});

describe('cancelling a weekly check-in', () => {
  it('is the coach’s alone once it is approved', () => {
    // arrange
    const weekly = checkin({ kind: 'recurring', status: 'approved', seriesId: 'series-1' });

    // act
    const byCoach = canCancelApproved(weekly, 'coach');
    const byClient = canCancelApproved(weekly, 'client');

    // assert
    expect(byCoach).toBe(true);
    expect(byClient).toBe(false);
  });
});
