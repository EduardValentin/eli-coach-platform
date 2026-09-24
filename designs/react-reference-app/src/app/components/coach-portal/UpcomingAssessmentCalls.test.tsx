import { render, screen, within } from '@testing-library/react';
import { subDays } from 'date-fns';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { UpcomingAssessmentCalls } from './UpcomingAssessmentCalls';
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
    bookedAt: subDays(startsAt, 3),
    firstName,
    lastName,
    visitorEmail: 'ana.popescu@example.com',
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: null,
    notes: 'Training three times a week.',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
  };
}

const LATER_TODAY = bookingAt(localInstant(21, 18), 'Maria Ionescu');
const TOMORROW = bookingAt(localInstant(22, 18), 'Ioana Radu');
const IN_THREE_DAYS = bookingAt(localInstant(24, 18), 'Andreea Pop');
const IN_FOUR_DAYS = bookingAt(localInstant(25, 18), 'Diana Voicu');
const ENDED_TODAY = bookingAt(localInstant(21, 9), 'Sofia Dinu');
const YESTERDAY = bookingAt(localInstant(20, 18), 'Elena Marin');

function renderWidget(bookings: PrototypeBooking[]) {
  render(
    <MemoryRouter initialEntries={['/coach']}>
      <UpcomingAssessmentCalls
        bookings={bookings}
        now={NOW}
        timeZone={TIME_ZONE}
      />
    </MemoryRouter>,
  );
}

describe('the upcoming calls widget', () => {
  it('heads the card and shows no zone line', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Upcoming calls' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Times in/)).toBeNull();
  });

  it('lists the one call still to come', () => {
    // arrange
    const bookings = [ENDED_TODAY, LATER_TODAY, YESTERDAY];

    // act
    renderWidget(bookings);

    // assert
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Maria Ionescu')).toBeInTheDocument();
  });

  it('lists three calls soonest first when three are coming', () => {
    // arrange
    const bookings = [IN_THREE_DAYS, LATER_TODAY, TOMORROW];

    // act
    renderWidget(bookings);

    // assert
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Maria Ionescu')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ioana Radu')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Andreea Pop')).toBeInTheDocument();
  });

  it('shows only the three soonest when more are booked', () => {
    // arrange
    const bookings = [
      IN_FOUR_DAYS,
      IN_THREE_DAYS,
      LATER_TODAY,
      TOMORROW,
      YESTERDAY,
    ];

    // act
    renderWidget(bookings);

    // assert
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Maria Ionescu')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Andreea Pop')).toBeInTheDocument();
    expect(screen.queryByText('Diana Voicu')).toBeNull();
  });

  it('shows each call in the dashboard short format with a join link', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);
    const row = screen.getByRole('listitem');

    // assert
    expect(row).toHaveTextContent('Mon, Sep 21· 6:00 PM');
    expect(within(row).getByText('Today')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Join call' })).toHaveAttribute(
      'href',
      `/book/${LATER_TODAY.id}/join`,
    );
  });

  it('leaves the badge off a call that starts another day', () => {
    // arrange
    const bookings = [TOMORROW];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('leaves the visitor notes and email to the full list', () => {
    // arrange
    const bookings = [LATER_TODAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.queryByText(/Training three times a week\./)).toBeNull();
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });

  it('says there is nothing upcoming once every call has ended', () => {
    // arrange
    const bookings = [ENDED_TODAY, YESTERDAY];

    // act
    renderWidget(bookings);

    // assert
    expect(screen.getByText('No upcoming calls.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Join call' })).toBeNull();
  });

  it('leads to the full list whether or not a call is coming up', () => {
    // arrange
    const bookings: PrototypeBooking[] = [];

    // act
    renderWidget(bookings);

    // assert
    expect(
      screen.getByRole('link', { name: 'View all calls' }),
    ).toHaveAttribute('href', '/coach/assessment-calls');
  });
});
