import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NextAssessmentCall } from './NextAssessmentCall';
import type { PrototypeBooking } from '../../services/assessmentCallService';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const NOW = new Date(2026, 8, 21, 12, 0, 0);

function localInstant(day: number, hour: number): Date {
  return new Date(2026, 8, day, hour, 0, 0);
}

function bookingAt(startsAt: Date, visitorName: string): PrototypeBooking {
  const id = `ac-${startsAt.getTime()}`;

  return {
    id,
    startsAt,
    visitorName,
    visitorEmail: 'ana.popescu@example.com',
    notes: 'Training three times a week.',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
  };
}

const LATER_TODAY = bookingAt(localInstant(21, 18), 'Maria Ionescu');
const TOMORROW = bookingAt(localInstant(22, 18), 'Ioana Radu');
const ENDED_TODAY = bookingAt(localInstant(21, 9), 'Sofia Dinu');
const YESTERDAY = bookingAt(localInstant(20, 18), 'Elena Marin');

function renderWidget(bookings: PrototypeBooking[]) {
  render(
    <MemoryRouter initialEntries={['/coach']}>
      <NextAssessmentCall bookings={bookings} now={NOW} timeZone={TIME_ZONE} />
    </MemoryRouter>,
  );
}

describe('the next assessment call widget', () => {
  it('names the zone every time is shown in', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(
      screen.getByText(new RegExp(`Times in ${TIME_ZONE}`)),
    ).toBeInTheDocument();
  });

  it('shows the soonest call that has not ended, passing over one that has', () => {
    // arrange
    const bookings = [TOMORROW, ENDED_TODAY, LATER_TODAY, YESTERDAY];

    // act
    renderWidget(bookings);

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Next call' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Maria Ionescu' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sofia Dinu')).toBeNull();
    expect(
      screen.getByText('Monday, 21 September 2026 at 6:00 PM'),
    ).toBeInTheDocument();
  });

  it('badges the next call when it starts today', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('leaves the badge off a call that starts another day', () => {
    // arrange
    const bookings = [TOMORROW];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('offers a join link to the booking', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.getByRole('link', { name: 'Join call' })).toHaveAttribute(
      'href',
      `/book/${LATER_TODAY.id}/join`,
    );
  });

  it('leaves the visitor notes to the full list', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.queryByText(/Training three times a week\./)).toBeNull();
  });

  it('says there is nothing upcoming once every call has ended', () => {
    // arrange
    const bookings = [ENDED_TODAY, YESTERDAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.getByText('No upcoming calls.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join call' })).toBeNull();
  });

  it('leads to the full list beside the next call', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(
      screen.getByRole('link', { name: 'View all calls' }),
    ).toHaveAttribute('href', '/coach/assessment-calls');
  });

  it('still leads to the full list when no call is booked', () => {
    // arrange
    const bookings: PrototypeBooking[] = [];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.getByText('No upcoming calls.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View all calls' }),
    ).toHaveAttribute('href', '/coach/assessment-calls');
  });
});
