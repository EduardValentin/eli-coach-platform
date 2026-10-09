import { describe, expect, it } from 'vitest';
import {
  canCancelApproved,
  canPropose,
  canWithdrawRequest,
  checkinNote,
  checkinStatus,
  coachingEndsAt,
  isJoinable,
  isOpenClientRequest,
  latestMove,
  programReviewCheckin,
  proposesNewTime,
  type CheckIn,
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

  it('stops new proposals after two reschedule rounds', () => {
    // arrange
    const exhausted = checkin({ rescheduleCount: 2 });

    // act
    const allowed = canPropose(exhausted);

    // assert
    expect(allowed).toBe(false);
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

describe('cancelling an approved check-in', () => {
  it('lets the coach cancel a recurring check-in', () => {
    // arrange
    const recurring = checkin({ kind: 'recurring' });

    // act
    const allowed = canCancelApproved(recurring, 'coach');

    // assert
    expect(allowed).toBe(true);
  });

  it('lets the client cancel an ad-hoc check-in', () => {
    // arrange
    const adHoc = checkin({ kind: 'ad-hoc' });

    // act
    const allowed = canCancelApproved(adHoc, 'client');

    // assert
    expect(allowed).toBe(true);
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
      rescheduleMessage: 'Thursday suits me better',
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
