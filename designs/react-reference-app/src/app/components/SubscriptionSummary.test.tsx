import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SubscriptionSummary } from './SubscriptionSummary';
import type { CoachingSubscription } from '../domain/coachingSubscription';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

const SUBSCRIPTION: CoachingSubscription = {
  bundle: 3,
  startPath: 'immediate',
  purchasedAt: new Date(2026, 8, 20),
  amountPaidCents: 44700,
  status: 'active',
  paymentProblem: false,
  day1: new Date(2026, 8, 21),
  periodEndsAt: new Date(2026, 11, 21),
};

function terms(): (string | null)[] {
  return within(screen.getByRole('region', { name: 'Subscription' }))
    .getAllByRole('term')
    .map((term) => term.textContent);
}

describe('the subscription summary', () => {
  it('ends the coach view with whether she paid the reduced price', () => {
    // arrange
    const subscription = SUBSCRIPTION;

    // act
    render(
      <SubscriptionSummary
        subscription={subscription}
        perspective="coach"
        clientGender="female"
        pricing="reduced"
        headingId="subscription-heading"
      />,
    );

    // assert
    expect(terms()).toEqual([
      'Bundle',
      'Payment date',
      'Start',
      'Start program',
      'Renews on',
      'Reduced price',
    ]);
    expect(
      screen.getByText('Reduced price').nextElementSibling,
    ).toHaveTextContent(/^Yes$/);
  });

  it('keeps the reduced price out of the client view', () => {
    // arrange
    const subscription = SUBSCRIPTION;

    // act
    render(
      <SubscriptionSummary
        subscription={subscription}
        perspective="client"
        headingId="subscription-heading"
      />,
    );

    // assert
    expect(terms()).toEqual([
      'Bundle',
      'Payment date',
      'Start',
      'Start program',
      'Renews on',
    ]);
  });

  it('keeps the refund readings out of the client view', () => {
    // arrange
    const subscription: CoachingSubscription = {
      ...SUBSCRIPTION,
      status: 'ended',
      periodEndsAt: new Date(2026, 8, 25),
      refund: {
        amountCents: 44700,
        reason: 'full-refund',
        dueBy: new Date(2026, 9, 9),
        refundedCents: 0,
      },
    };

    // act
    render(
      <SubscriptionSummary
        subscription={subscription}
        perspective="client"
        headingId="subscription-heading"
      />,
    );

    // assert
    expect(terms()).toEqual([
      'Bundle',
      'Payment date',
      'Start',
      'Start program',
      'Ended on',
    ]);
  });

  it('ends the coach view with the refund still due and why', () => {
    // arrange
    const subscription: CoachingSubscription = {
      ...SUBSCRIPTION,
      status: 'ended',
      periodEndsAt: new Date(2026, 8, 25),
      refund: {
        amountCents: 44700,
        reason: 'full-refund',
        dueBy: new Date(2026, 9, 9),
        refundedCents: 0,
      },
    };

    // act
    render(
      <SubscriptionSummary
        subscription={subscription}
        perspective="coach"
        clientGender="female"
        pricing="regular"
        headingId="subscription-heading"
      />,
    );

    // assert
    expect(terms().at(-1)).toBe('Refund due');
    expect(screen.getByText('€447 by 9 October')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Full refund: cancelled within the 14-day withdrawal period.',
      ),
    ).toBeInTheDocument();
  });

  it('tells the coach the renewal waits until her program is delivered', () => {
    // arrange
    const subscription: CoachingSubscription = {
      ...SUBSCRIPTION,
      status: 'not-started',
      day1: undefined,
      periodEndsAt: undefined,
    };

    // act
    render(
      <SubscriptionSummary
        subscription={subscription}
        perspective="coach"
        clientGender="female"
        pricing="regular"
        headingId="subscription-heading"
      />,
    );

    // assert
    expect(screen.getByText('Renews on').nextElementSibling).toHaveTextContent(
      /^Starts when her program is delivered$/,
    );
  });
});
