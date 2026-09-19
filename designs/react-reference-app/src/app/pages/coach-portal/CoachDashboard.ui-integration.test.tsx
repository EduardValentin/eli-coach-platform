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

  it('counts the calls that start today in the greeting', () => {
    // arrange
    const bookings = [bookingAt(LATER_TODAY, 'Maria Ionescu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByText('You have 1 assessment call today.'),
    ).toBeInTheDocument();
  });

  it('lists the booked calls in the assessment calls section', () => {
    // arrange
    const bookings = [bookingAt(LATER_TODAY, 'Maria Ionescu')];

    // act
    renderDashboard(bookings);

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Assessment calls' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Maria Ionescu' }),
    ).toBeInTheDocument();
  });
});
