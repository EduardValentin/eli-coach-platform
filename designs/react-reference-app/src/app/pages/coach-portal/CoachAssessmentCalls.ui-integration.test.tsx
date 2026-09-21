import { useEffect } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachAssessmentCalls } from './CoachAssessmentCalls';
import { AppProvider } from '../../context/AppContext';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from '../../context/AssessmentCallContext';
import type { PrototypeBooking } from '../../services/assessmentCallService';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const NOW = new Date(2026, 8, 21, 12, 0, 0);

function localInstant(day: number, hour: number): Date {
  return new Date(2026, 8, day, hour, 0, 0);
}

function bookingAt(startsAt: Date, visitorName: string): PrototypeBooking {
  const id = `ac-${startsAt.getTime()}`;
  const [firstName, lastName] = visitorName.split(' ');

  return {
    id,
    startsAt,
    firstName,
    lastName,
    visitorEmail: `${firstName.toLowerCase()}@example.com`,
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
  };
}

const LATER_TODAY = bookingAt(localInstant(21, 18), 'Maria Ionescu');
const TOMORROW = bookingAt(localInstant(22, 18), 'Ioana Radu');
const YESTERDAY = bookingAt(localInstant(20, 18), 'Elena Marin');

const ALL_BOOKINGS = [LATER_TODAY, TOMORROW, YESTERDAY];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

function SeedBookings({ bookings }: { bookings: PrototypeBooking[] }) {
  const { replaceBookings } = useAssessmentCalls();

  useEffect(() => {
    replaceBookings(bookings);
  }, [bookings, replaceBookings]);

  return null;
}

function LocationProbe() {
  const { search } = useLocation();
  const navigationType = useNavigationType();

  return <p data-testid="location-probe">{`${search} ${navigationType}`}</p>;
}

function renderPage(
  options: { bookings?: PrototypeBooking[]; urlQuery?: string } = {},
) {
  render(
    <MemoryRouter
      initialEntries={[`/coach/assessment-calls${options.urlQuery ?? ''}`]}
    >
      <AppProvider>
        <AssessmentCallProvider>
          <SeedBookings bookings={options.bookings ?? ALL_BOOKINGS} />
          <CoachAssessmentCalls />
          <LocationProbe />
        </AssessmentCallProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function listedNames(): string[] {
  return screen
    .getAllByRole('listitem')
    .map(
      (item) => within(item).getByRole('heading', { level: 2 }).textContent ?? '',
    );
}

describe('the coach assessment calls page when the calls cannot be read', () => {
  it('replaces the listing with the unavailable dead end', () => {
    // arrange
    window.history.replaceState({}, '', '/coach/assessment-calls?coachcalls=unavailable');

    // act
    renderPage();

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Assessment calls unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your assessment calls could not be loaded. Try again in a moment.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

describe('the coach assessment calls page', () => {
  it('titles the page', () => {
    // arrange
    const bookings: PrototypeBooking[] = [];

    // act
    renderPage({ bookings });

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Assessment calls' }),
    ).toBeInTheDocument();
  });

  it('names no time zone, because every time is the reader’s own', () => {
    // arrange
    const bookings: PrototypeBooking[] = [];

    // act
    renderPage({ bookings });

    // assert
    expect(screen.queryByText(/Times in /)).not.toBeInTheDocument();
  });

  it('opens on the upcoming calls with the search and the filters ready', () => {
    // arrange
    const bookings = ALL_BOOKINGS;

    // act
    renderPage({ bookings });

    // assert
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Search calls')).toHaveValue('');
    expect(listedNames()).toEqual(['Maria Ionescu', 'Ioana Radu']);
  });

  it('opens on the filter and the search the URL carries', () => {
    // arrange
    const urlQuery = '?status=all&q=marin';

    // act
    renderPage({ urlQuery });

    // assert
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Search calls')).toHaveValue('marin');
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('writes the filter and the search the coach picks into the URL', async () => {
    // arrange
    const user = renderPage();

    // act
    await user.click(screen.getByRole('tab', { name: 'Past' }));
    await user.type(screen.getByLabelText('Search calls'), 'elena');

    // assert
    expect(screen.getByTestId('location-probe')).toHaveTextContent(
      '?status=past&q=elena REPLACE',
    );
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('moves between the filters with the arrow keys', async () => {
    // arrange
    const user = renderPage();

    // act
    await user.click(screen.getByLabelText('Search calls'));
    await user.tab();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}');

    // assert
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveFocus();
    await waitFor(() => expect(listedNames()).toEqual(['Elena Marin']));
  });
});
