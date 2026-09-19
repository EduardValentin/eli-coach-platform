import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AssessmentCallsSection } from './AssessmentCallsSection';
import type { PrototypeBooking } from '../../services/assessmentCallService';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const NOW = new Date(2026, 8, 21, 12, 0, 0);

function localInstant(day: number, hour: number): Date {
  return new Date(2026, 8, day, hour, 0, 0);
}

function bookingAt(startsAt: Date, details: Partial<PrototypeBooking> = {}) {
  const id = `ac-${startsAt.getTime()}`;
  return {
    id,
    startsAt,
    visitorName: 'Ana Popescu',
    visitorEmail: 'ana.popescu@example.com',
    notes: '',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
    ...details,
  } satisfies PrototypeBooking;
}

const LATER_TODAY = bookingAt(localInstant(21, 18), {
  visitorName: 'Maria Ionescu',
  visitorEmail: 'maria@example.com',
  notes: 'Training three times a week.\nShoulder injury last year.',
});
const TOMORROW = bookingAt(localInstant(22, 18), {
  visitorName: 'Ioana Radu',
  visitorEmail: 'ioana@studio.ro',
});
const EARLIER_TODAY = bookingAt(localInstant(21, 9), {
  visitorName: 'Sofia Dinu',
  visitorEmail: 'sofia@example.com',
});
const YESTERDAY = bookingAt(localInstant(20, 18), {
  visitorName: 'Elena Marin',
  visitorEmail: 'elena@example.com',
});

const ALL_BOOKINGS = [LATER_TODAY, TOMORROW, EARLIER_TODAY, YESTERDAY];

function LocationProbe() {
  const { search } = useLocation();
  const navigationType = useNavigationType();

  return <p data-testid="location-probe">{`${search} ${navigationType}`}</p>;
}

function renderSection(
  options: { bookings?: PrototypeBooking[]; urlQuery?: string } = {},
) {
  render(
    <MemoryRouter initialEntries={[`/coach${options.urlQuery ?? ''}`]}>
      <AssessmentCallsSection
        bookings={options.bookings ?? ALL_BOOKINGS}
        now={NOW}
        timeZone={TIME_ZONE}
      />
      <LocationProbe />
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function currentLocation(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function listedNames(): string[] {
  return screen
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('heading', { level: 2 }).textContent ?? '');
}

async function selectTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('tab', { name }));
}

describe('the assessment calls section', () => {
  it('opens on upcoming calls, soonest first', () => {
    // arrange
    renderSection();

    // act
    const names = listedNames();

    // assert
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(names).toEqual(['Maria Ionescu', 'Ioana Radu']);
  });

  it('shows the visitor email as a mail link and the notes as written', () => {
    // arrange
    renderSection();

    // act
    const item = screen.getAllByRole('listitem')[0];

    // assert
    expect(within(item).getByRole('link', { name: 'maria@example.com' })).toHaveAttribute(
      'href',
      'mailto:maria@example.com',
    );
    expect(
      within(item).getByText(/Shoulder injury last year\./),
    ).toHaveTextContent('Training three times a week. Shoulder injury last year.');
  });

  it('offers a join link while the call has not ended and none once it has', async () => {
    // arrange
    const user = renderSection();

    // act
    const upcomingItem = screen.getAllByRole('listitem')[0];
    await selectTab(user, 'Past');
    const pastItem = screen.getAllByRole('listitem')[0];

    // assert
    expect(within(upcomingItem).getByRole('link', { name: 'Join call' })).toHaveAttribute(
      'href',
      `/book/${LATER_TODAY.id}/join`,
    );
    expect(within(pastItem).queryByRole('link', { name: 'Join call' })).toBeNull();
  });

  it('badges every call that starts today, ended or not', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Today');
    const items = screen.getAllByRole('listitem');

    // assert
    expect(listedNames()).toEqual(['Maria Ionescu', 'Sofia Dinu']);
    expect(within(items[0]).getByText('Today')).toBeInTheDocument();
    expect(within(items[1]).getByText('Today')).toBeInTheDocument();
  });

  it('marks an ended call as past instead of offering it an action', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');
    const pastItem = screen.getAllByRole('listitem')[0];

    // assert
    expect(within(pastItem).getByText('Past')).toBeInTheDocument();
    expect(within(pastItem).queryByRole('link', { name: 'Join call' })).toBeNull();
  });

  it('still offers a way to reach the visitor after the call has ended', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');
    const pastItem = screen.getAllByRole('listitem')[0];

    // assert
    expect(
      within(pastItem).getByRole('link', { name: 'sofia@example.com' }),
    ).toHaveAttribute('href', 'mailto:sofia@example.com');
  });

  it('lists past calls most recent first', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');

    // assert
    expect(listedNames()).toEqual(['Sofia Dinu', 'Elena Marin']);
  });

  it('lists the upcoming calls before the past ones under all', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'All');

    // assert
    expect(listedNames()).toEqual([
      'Maria Ionescu',
      'Ioana Radu',
      'Sofia Dinu',
      'Elena Marin',
    ]);
  });

  it('moves between the filters with the arrow keys', async () => {
    // arrange
    const user = renderSection();

    // act
    await user.click(screen.getByLabelText('Search calls'));
    await user.tab();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}');

    // assert
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveFocus();
    await waitFor(() =>
      expect(listedNames()).toEqual(['Sofia Dinu', 'Elena Marin']),
    );
  });

  it('narrows the list as the coach types and restores it when she clears', async () => {
    // arrange
    const user = renderSection();
    const search = screen.getByLabelText('Search calls');

    // act
    await user.type(search, 'ioana@');

    // assert
    expect(listedNames()).toEqual(['Ioana Radu']);

    // act
    await user.clear(search);

    // assert
    expect(listedNames()).toEqual(['Maria Ionescu', 'Ioana Radu']);
  });

  it('searches within the chosen filter only', async () => {
    // arrange
    const user = renderSection();

    // act
    await user.type(screen.getByLabelText('Search calls'), 'Elena');

    // assert
    expect(screen.getByText('No calls match your search.')).toBeInTheDocument();

    // act
    await selectTab(user, 'Past');

    // assert
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('writes the filter and the search to the URL without stacking history', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');
    await user.type(screen.getByLabelText('Search calls'), 'elena');

    // assert
    expect(currentLocation()).toBe('?status=past&q=elena REPLACE');
  });

  it('keeps the default filter and an empty search out of the URL', async () => {
    // arrange
    const user = renderSection({ urlQuery: '?status=past&q=elena' });

    // act
    await user.clear(screen.getByLabelText('Search calls'));
    await selectTab(user, 'Upcoming');

    // assert
    expect(currentLocation()).toBe(' REPLACE');
  });

  it('opens on the filter and search the URL carries', () => {
    // arrange
    renderSection({ urlQuery: '?status=all&q=marin' });

    // act
    const search = screen.getByLabelText('Search calls');

    // assert
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(search).toHaveValue('marin');
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('falls back to upcoming when the URL carries an unknown filter', () => {
    // arrange
    renderSection({ urlQuery: '?status=yesterday' });

    // act
    const upcomingTab = screen.getByRole('tab', { name: 'Upcoming' });

    // assert
    expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
    expect(listedNames()).toEqual(['Maria Ionescu', 'Ioana Radu']);
  });

  it('says there is nothing upcoming when every call has ended', () => {
    // arrange
    renderSection({ bookings: [YESTERDAY] });

    // act
    const message = screen.getByText('No upcoming calls.');

    // assert
    expect(message).toBeInTheDocument();
  });

  it('says there is nothing today when no call starts today', async () => {
    // arrange
    const user = renderSection({ bookings: [TOMORROW] });

    // act
    await selectTab(user, 'Today');

    // assert
    expect(screen.getByText('No calls today.')).toBeInTheDocument();
  });

  it('says there is nothing past when no call has ended', async () => {
    // arrange
    const user = renderSection({ bookings: [TOMORROW] });

    // act
    await selectTab(user, 'Past');

    // assert
    expect(screen.getByText('No past calls.')).toBeInTheDocument();
  });

  it('says there are no calls yet when none is booked', async () => {
    // arrange
    const user = renderSection({ bookings: [] });

    // act
    await selectTab(user, 'All');

    // assert
    expect(screen.getByText('No calls yet.')).toBeInTheDocument();
  });
});
