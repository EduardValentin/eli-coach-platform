import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClientJourney } from '../../domain/journey';
import {
  seedJourney,
  type PrototypeLifeStage,
} from '../../services/clientJourneySamples';
import { JourneyMeasurements } from './JourneyMeasurements';

const METRIC = { weight: 'kg', length: 'cm' } as const;

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

function submittedJourney(lifeStage: PrototypeLifeStage): ClientJourney {
  const journey = seedJourney({
    callId: 'ac-coach-measurements',
    identity: {
      firstName: 'Ana',
      lastName: 'Popescu',
      dateOfBirth: '1994-03-14',
      email: 'ana@example.com',
      gender: 'female',
      country: 'RO',
    },
    stage: 'reviewing',
    startPath: 'immediate',
    subscriptionStatus: 'active',
    pricing: 'regular',
    bookingNotes: null,
    invitationStanding: 'sent',
    prototypeMode: 'mvp',
    measurementsDue: 'none',
    lifeStage,
    seededPhotos: 'none',
    refund: 'none',
    paymentProblem: false,
    daysSincePayment: 'stage',
    now: new Date(2026, 8, 21, 12),
  });
  const [first] = journey.measurements;

  return {
    ...journey,
    measurements: [
      { ...first, photos: { front: { url: 'blob:front' } } },
    ],
  };
}

function ratioCell(): HTMLElement {
  const [header, row] = screen.getAllByRole('row');
  const ratioIndex = within(header)
    .getAllByRole('columnheader')
    .findIndex((cell) => cell.textContent === 'Ratio');

  return within(row).getAllByRole('cell')[ratioIndex];
}

describe("the coach's measurements panel", () => {
  it('shows the waist-to-height ratio', () => {
    // arrange
    const journey = submittedJourney('none');

    // act
    render(<JourneyMeasurements heightCm={165} journey={journey} units={METRIC} />);

    // assert
    expect(ratioCell()).toHaveTextContent('0.45');
  });

  it('blanks the ratio while the client is pregnant', () => {
    // arrange
    const journey = submittedJourney('pregnant');

    // act
    render(<JourneyMeasurements heightCm={165} journey={journey} units={METRIC} />);

    // assert
    expect(ratioCell()).toHaveTextContent('—');
  });

  it("opens the client's photos without a remove control", async () => {
    // arrange
    render(
      <JourneyMeasurements
        heightCm={165}
        journey={submittedJourney('none')}
        units={METRIC}
      />,
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: /^View photos/ }));

    // assert
    const dialog = screen.getByRole('dialog', { name: /^Photos from/ });
    expect(within(dialog).getByRole('img', { name: 'Front photo' })).toBeVisible();
    expect(
      within(dialog).queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });
});
