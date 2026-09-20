import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachDashboard } from './CoachDashboard';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import type { PrototypeBooking } from '../../services/assessmentCallService';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function bookingAt(startsAt: Date, visitorName: string): PrototypeBooking {
  const id = `ac-${startsAt.getTime()}`;

  return {
    id,
    startsAt,
    visitorName,
    visitorEmail: 'ana.popescu@example.com',
    notes: '',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
  };
}

const NOW = new Date(2026, 8, 21, 12, 0, 0);
const ENDED_TODAY = new Date(2026, 8, 21, 9, 0, 0);
const LATER_TODAY = new Date(2026, 8, 21, 18, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function SeedBookings({ bookings }: { bookings: PrototypeBooking[] }) {
  const { replaceBookings } = useAssessmentCalls();

  useEffect(() => {
    replaceBookings(bookings);
  }, [bookings, replaceBookings]);

  return null;
}

function renderDashboard(bookings: PrototypeBooking[]) {
  render(
    <MemoryRouter initialEntries={['/coach']}>
      <CheckinProvider>
        <AssessmentCallProvider>
          <SeedBookings bookings={bookings} />
          <CoachDashboard />
        </AssessmentCallProvider>
      </CheckinProvider>
    </MemoryRouter>,
  );
}

describe('the coach dashboard', () => {
  it('greets the coach with no calls when none is booked today', () => {
    // arrange
    const bookings: PrototypeBooking[] = [];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByText('You have 0 assessment calls today.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/check-ins? to review\./)).toBeInTheDocument();
  });

  it('counts the calls she has left today in the greeting', () => {
    // arrange
    const bookings = [bookingAt(LATER_TODAY, 'Maria Ionescu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByText('You have 1 assessment call today.'),
    ).toBeInTheDocument();
  });

  it('stops counting a call once it has ended', () => {
    // arrange
    const bookings = [bookingAt(ENDED_TODAY, 'Sofia Dinu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByText('You have 0 assessment calls today.'),
    ).toBeInTheDocument();
  });

  it('shows the soonest call in the upcoming calls widget', () => {
    // arrange
    const bookings = [bookingAt(LATER_TODAY, 'Maria Ionescu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Upcoming calls' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
  });

  it('sends the coach from the widget to the full list of calls', () => {
    // arrange
    const bookings = [bookingAt(LATER_TODAY, 'Maria Ionescu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByRole('link', { name: 'View all calls' }),
    ).toHaveAttribute('href', '/coach/assessment-calls');
    expect(screen.queryByRole('tab', { name: 'Upcoming' })).toBeNull();
  });
});
