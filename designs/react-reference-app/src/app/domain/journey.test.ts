import { describe, expect, it } from 'vitest';
import {
  advance,
  clientStatusLabel,
  COACH_STAGE_LABELS,
  emptyOnboarding,
  isBeforeStage,
  type ClientJourney,
  type JourneyEvent,
  type JourneyStage,
} from './journey';

function journeyAt(stage: JourneyStage): ClientJourney {
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
  };
}

function stageAfter(stage: JourneyStage, event: JourneyEvent): JourneyStage {
  const transition = advance(journeyAt(stage), event);
  if (transition.status === 'rejected') {
    throw new Error(`${stage} refused ${event}`);
  }
  return transition.journey.stage;
}

describe('advancing a journey', () => {
  const legalSteps: [JourneyStage, JourneyEvent, JourneyStage][] = [
    ['held', 'send-payment-link', 'payment-link-sent'],
    ['payment-link-sent', 'record-payment', 'invited'],
    ['invited', 'create-account', 'account-created'],
    ['account-created', 'start-onboarding', 'onboarding'],
    ['onboarding', 'submit-onboarding', 'submitted'],
    ['submitted', 'start-review', 'reviewing'],
    ['reviewing', 'approve-answers', 'approved'],
    ['reviewing', 'mark-program-ready', 'program-ready'],
    ['approved', 'mark-program-ready', 'program-ready'],
    ['program-ready', 'schedule-review-call', 'review-call-scheduled'],
  ];

  it.each(legalSteps)('takes %s through %s to %s', (stage, event, expected) => {
    // arrange
    const journey = journeyAt(stage);

    // act
    const transition = advance(journey, event);

    // assert
    expect(transition).toEqual({
      status: 'advanced',
      journey: { ...journey, stage: expected },
    });
  });

  it('loops between reviewing and needing more details', () => {
    // arrange
    const reviewing = journeyAt('reviewing');

    // act
    const flagged = stageAfter(reviewing.stage, 'request-details');
    const answered = stageAfter(flagged, 'answer-request');

    // assert
    expect([flagged, answered]).toEqual(['needs-details', 'reviewing']);
  });

  it('refuses to reopen review once the answers are approved', () => {
    // arrange
    const journey = journeyAt('approved');

    // act
    const transition = advance(journey, 'request-details');

    // assert
    expect(transition).toEqual({
      status: 'rejected',
      stage: 'approved',
      event: 'request-details',
    });
  });

  it('lets the coach build the program without reviewing the answers first', () => {
    // arrange
    const journey = journeyAt('submitted');

    // act
    const transition = advance(journey, 'mark-program-ready');

    // assert
    expect(transition).toEqual({
      status: 'advanced',
      journey: { ...journey, stage: 'program-ready' },
    });
  });

  it('lets the coach resend a payment link without moving the journey on', () => {
    // arrange
    const journey = journeyAt('payment-link-sent');

    // act
    const transition = advance(journey, 'send-payment-link');

    // assert
    expect(transition).toEqual({ status: 'advanced', journey });
  });

  it('refuses a step backwards', () => {
    // arrange
    const journey = journeyAt('program-ready');

    // act
    const transition = advance(journey, 'start-review');

    // assert
    expect(transition).toEqual({
      status: 'rejected',
      stage: 'program-ready',
      event: 'start-review',
    });
  });

  it('refuses a step that skips a stage', () => {
    // arrange
    const journey = journeyAt('held');

    // act
    const transition = advance(journey, 'create-account');

    // assert
    expect(transition).toEqual({
      status: 'rejected',
      stage: 'held',
      event: 'create-account',
    });
  });

  it('leaves the last stage with nowhere to go', () => {
    // arrange
    const journey = journeyAt('review-call-scheduled');

    // act
    const transition = advance(journey, 'schedule-review-call');

    // assert
    expect(transition.status).toBe('rejected');
  });
});

describe('journey labels', () => {
  it('names the stages the coach sees', () => {
    // arrange
    const stages: JourneyStage[] = [
      'payment-link-sent',
      'invited',
      'account-created',
      'onboarding',
      'submitted',
      'reviewing',
      'needs-details',
      'approved',
      'program-ready',
      'review-call-scheduled',
    ];

    // act
    const labels = stages.map((stage) => COACH_STAGE_LABELS[stage]);

    // assert
    expect(labels).toEqual([
      'Payment link sent',
      'Invited',
      'Invitation accepted',
      'Onboarding',
      'Sent to coach',
      'Reviewing',
      'Needs more details',
      'Approved',
      'Program ready',
      'Review call booked',
    ]);
  });

  it('speaks to the client only from the moment she has sent her answers', () => {
    // arrange
    const stages: JourneyStage[] = [
      'onboarding',
      'submitted',
      'reviewing',
      'needs-details',
      'approved',
      'program-ready',
    ];

    // act
    const labels = stages.map(clientStatusLabel);

    // assert
    expect(labels).toEqual([
      null,
      'Sent to your coach',
      'Your coach is reviewing your answers',
      'Your coach needs a few more details',
      'Your answers are approved',
      'Your program is ready',
    ]);
  });
});

describe('ordering stages', () => {
  it('places every pre-submission stage before submitted', () => {
    // arrange
    const stages: JourneyStage[] = [
      'held',
      'payment-link-sent',
      'invited',
      'account-created',
      'onboarding',
    ];

    // act
    const before = stages.map((stage) => isBeforeStage(stage, 'submitted'));

    // assert
    expect(before).toEqual([true, true, true, true, true]);
  });

  it('places the review loop after submitted', () => {
    // arrange
    const stages: JourneyStage[] = [
      'submitted',
      'reviewing',
      'needs-details',
      'approved',
    ];

    // act
    const before = stages.map((stage) => isBeforeStage(stage, 'submitted'));

    // assert
    expect(before).toEqual([false, false, false, false]);
  });
});
