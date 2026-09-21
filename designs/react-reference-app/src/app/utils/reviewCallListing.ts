import type { ClientJourney, ReviewCall } from '../domain/journey';

export const PROGRAM_REVIEW_LABEL = 'Program review';

export const REVIEW_CALL_BOOKING_WINDOW_DAYS = 14;

export const PROGRAM_READY_NOTIFICATION = {
  title: 'Your program is ready',
  message:
    'Your program is ready — book your review call with Eli within the next 48 hours.',
  link: '/portal?review=1',
};

export function upcomingReviewCall(
  journey: ClientJourney,
  now: Date,
): ReviewCall | null {
  const call = journey.reviewCall;

  return call && call.startsAt.getTime() >= now.getTime() ? call : null;
}

export function needsReviewCall(journey: ClientJourney): boolean {
  return journey.stage === 'program-ready';
}
