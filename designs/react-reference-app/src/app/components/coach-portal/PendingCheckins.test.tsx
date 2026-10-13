import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { CheckIn } from '../../domain/checkins';
import { PendingCheckins } from './PendingCheckins';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function requestFrom(clientName: string, date: string): CheckIn {
  const id = `ck-${clientName.split(' ')[0].toLowerCase()}`;

  return {
    id,
    clientId: id,
    clientName,
    coachId: 'coach-1',
    date,
    time: '10:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: '2026-09-20T09:00:00.000Z',
    rescheduleCount: 0,
  };
}

const LATEST = requestFrom('Diana Voicu', '2026-09-28');
const THIRD = requestFrom('Andreea Pop', '2026-09-25');
const SECOND = requestFrom('Ioana Radu', '2026-09-23');
const SOONEST = requestFrom('Maria Ionescu', '2026-09-22');

function renderCard(checkins: CheckIn[]) {
  render(
    <MemoryRouter initialEntries={['/coach']}>
      <PendingCheckins checkins={checkins} timeZone={TIME_ZONE} />
    </MemoryRouter>,
  );
}

function listedNames(): string[] {
  return screen
    .getAllByRole('listitem')
    .map((row) => within(row).getByText(/^[A-Z][a-z]+ [A-Z][a-z]+$/).textContent ?? '');
}

describe('the pending check-ins card', () => {
  it('lists the three soonest check-ins waiting for her answer, soonest first', () => {
    // arrange
    const checkins = [LATEST, THIRD, SECOND, SOONEST];

    // act
    renderCard(checkins);

    // assert
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pending Check-ins' }),
    ).toBeInTheDocument();
    expect(listedNames()).toEqual(['Maria Ionescu', 'Ioana Radu', 'Andreea Pop']);
  });

  it('opens each review on the check-ins page at that check-in', () => {
    // arrange
    const checkins = [SOONEST];

    // act
    renderCard(checkins);

    // assert
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute(
      'href',
      '/coach/checkins?checkin=ck-maria',
    );
  });

  it('says no check-in waits for her and still leads to all check-ins', () => {
    // arrange
    const checkins: CheckIn[] = [];

    // act
    renderCard(checkins);

    // assert
    expect(screen.getByText('No pending check-ins.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'View all check-ins' }),
    ).toHaveAttribute('href', '/coach/checkins');
  });
});
