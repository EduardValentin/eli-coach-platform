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
  status: 'active',
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
});
