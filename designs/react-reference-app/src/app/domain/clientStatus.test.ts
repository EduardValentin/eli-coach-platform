import { addDays, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { clientStatus, type ClientStatus } from './clientStatus';
import type { CoachingSubscription } from './coachingSubscription';
import { emptyOnboarding, type ClientJourney, type JourneyStage } from './journey';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

function journeyAt(
  stage: JourneyStage,
  subscription?: CoachingSubscription,
): ClientJourney {
  return {
    callId: 'ac-1',
    stage,
    identity: {
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1998-03-14',
      email: 'jane@example.com',
      sex: 'female',
      country: 'Romania',
    },
    pricing: 'regular',
    paymentLink: null,
    paidAt: null,
    invitation: null,
    welcomeSeen: false,
    onboarding: emptyOnboarding(),
    review: { requests: [] },
    programReadyAt: null,
    measurements: [],
    subscription,
  };
}

const RUNNING: CoachingSubscription = {
  bundle: 3,
  startPath: 'immediate',
  purchasedAt: subDays(NOW, 20),
  status: 'active',
  day1: subDays(NOW, 6),
  periodEndsAt: addDays(NOW, 84),
};

const WAITING: CoachingSubscription = {
  bundle: 3,
  startPath: 'waiting',
  purchasedAt: subDays(NOW, 5),
  status: 'active',
  day1: addDays(NOW, 9),
  periodEndsAt: addDays(NOW, 99),
};

const CANCELLED: CoachingSubscription = {
  ...RUNNING,
  status: 'cancelled',
  cancelledAt: subDays(NOW, 1),
  periodEndsAt: addDays(NOW, 30),
};

const ENDED: CoachingSubscription = {
  ...RUNNING,
  status: 'ended',
  cancelledAt: subDays(NOW, 40),
  periodEndsAt: subDays(NOW, 2),
};

describe('the status the coach reads on a client row', () => {
  const stageStatuses: [JourneyStage, ClientStatus][] = [
    ['held', { label: 'Call held', tone: 'neutral' }],
    ['payment-link-sent', { label: 'Payment link sent', tone: 'neutral' }],
    ['invited', { label: 'Invited', tone: 'neutral' }],
    ['account-created', { label: 'Onboarding', tone: 'neutral' }],
    ['onboarding', { label: 'Onboarding', tone: 'neutral' }],
    ['submitted', { label: 'Awaiting review', tone: 'pending' }],
    ['reviewing', { label: 'In review', tone: 'info' }],
    ['needs-details', { label: 'Needs details', tone: 'pending' }],
    ['approved', { label: 'Approved', tone: 'info' }],
    ['program-ready', { label: 'Active', tone: 'success' }],
    ['review-call-scheduled', { label: 'Active', tone: 'success' }],
  ];

  it.each(stageStatuses)('reads the %s stage as %o', (stage, expected) => {
    // arrange
    const journey = journeyAt(stage);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual(expected);
  });

  it('calls a client with her program and a running subscription active', () => {
    // arrange
    const journey = journeyAt('program-ready', RUNNING);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Active', tone: 'success' });
  });

  it('calls a client on the waiting path active before her first day', () => {
    // arrange
    const journey = journeyAt('program-ready', WAITING);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Active', tone: 'success' });
  });

  it('calls a client who cancelled with access left cancelled', () => {
    // arrange
    const journey = journeyAt('review-call-scheduled', CANCELLED);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Cancelled', tone: 'muted' });
  });

  it('calls a client whose subscription has run out inactive', () => {
    // arrange
    const journey = journeyAt('review-call-scheduled', ENDED);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Inactive', tone: 'muted' });
  });

  it('lets a cancellation during onboarding speak for the row', () => {
    // arrange
    const journey = journeyAt('submitted', CANCELLED);

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Cancelled', tone: 'muted' });
  });

  it('calls a cancelled subscription inactive once its last day has passed', () => {
    // arrange
    const journey = journeyAt('program-ready', {
      ...CANCELLED,
      periodEndsAt: subDays(NOW, 1),
    });

    // act
    const status = clientStatus(journey, NOW);

    // assert
    expect(status).toEqual({ label: 'Inactive', tone: 'muted' });
  });
});
