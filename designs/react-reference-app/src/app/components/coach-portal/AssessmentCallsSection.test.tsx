import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subDays } from 'date-fns';
import { useEffect } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AssessmentCallsSection } from './AssessmentCallsSection';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import { AppProvider } from '../../context/AppContext';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from '../../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import type { JourneyStage } from '../../domain/journey';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

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
    bookedAt: subDays(startsAt, 3),
    firstName: 'Ana',
    lastName: 'Popescu',
    visitorEmail: 'ana.popescu@example.com',
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: TIME_ZONE,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
    ...details,
  } satisfies PrototypeBooking;
}

const LATER_TODAY = bookingAt(localInstant(21, 18), {
  firstName: 'Maria',
  lastName: 'Ionescu',
  visitorEmail: 'maria@example.com',
  phone: '+40712345678',
  primaryGoal: 'lose_weight',
  notes: 'Training three times a week.\nShoulder injury last year.',
});
const TOMORROW = bookingAt(localInstant(22, 18), {
  firstName: 'Ioana',
  lastName: 'Radu',
  visitorEmail: 'ioana@studio.ro',
});
const EARLIER_TODAY = bookingAt(localInstant(21, 9), {
  firstName: 'Sofia',
  lastName: 'Dinu',
  visitorEmail: 'sofia@example.com',
});
const YESTERDAY = bookingAt(localInstant(20, 18), {
  firstName: 'Elena',
  lastName: 'Marin',
  visitorEmail: 'elena@example.com',
});

const TWO_DAYS_AGO = bookingAt(localInstant(19, 18), {
  firstName: 'Dana',
  lastName: 'Pop',
  visitorEmail: 'dana@example.com',
});
const THREE_DAYS_AGO = bookingAt(localInstant(18, 18), {
  firstName: 'Carmen',
  lastName: 'Iliescu',
  visitorEmail: 'carmen@example.com',
});

const ALL_BOOKINGS = [LATER_TODAY, TOMORROW, EARLIER_TODAY, YESTERDAY];

const JOURNEY_BOOKINGS = [
  TOMORROW,
  EARLIER_TODAY,
  YESTERDAY,
  TWO_DAYS_AGO,
  THREE_DAYS_AGO,
];

const JOURNEY_STAGES: Record<string, JourneyStage> = {
  [YESTERDAY.id]: 'payment-link-sent',
  [THREE_DAYS_AGO.id]: 'invited',
};

const REACHABLE_STAGES: JourneyStage[] = [
  'held',
  'payment-link-sent',
  'invited',
];

const DAY_MS = 24 * 60 * 60 * 1000;

const MANY_UPCOMING = Array.from({ length: 23 }, (_, index) =>
  bookingAt(new Date(NOW.getTime() + (index + 1) * DAY_MS), {
    firstName: 'Visitor',
    lastName: `${index + 1}`,
    visitorEmail: `visitor${index + 1}@example.com`,
  }),
);

function LocationProbe() {
  const { search } = useLocation();
  const navigationType = useNavigationType();

  return <p data-testid="location-probe">{`${search} ${navigationType}`}</p>;
}

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
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

function AdvanceJourneys({ stages }: { stages: Record<string, JourneyStage> }) {
  const { journeys, recordPaymentLinkSent, recordPaid } = useClientJourneys();

  useEffect(() => {
    for (const [callId, target] of Object.entries(stages)) {
      const journey = journeys[callId];
      if (!journey) continue;

      const reached = REACHABLE_STAGES.indexOf(journey.stage);
      if (reached < 0 || reached >= REACHABLE_STAGES.indexOf(target)) continue;

      if (reached === 0) {
        recordPaymentLinkSent(callId, { token: `pl-${callId}`, sentAt: NOW });
      } else {
        recordPaid(callId, {
          paidAt: NOW,
          bundle: 3,
          startPath: 'immediate',
        });
      }
    }
  }, [journeys, stages, recordPaymentLinkSent, recordPaid]);

  return null;
}

function SeedBookings({ bookings }: { bookings: PrototypeBooking[] }) {
  const { replaceBookings } = useAssessmentCalls();
  useEffect(() => {
    replaceBookings(bookings);
  }, [bookings, replaceBookings]);
  return null;
}

function renderSection(
  options: {
    bookings?: PrototypeBooking[];
    urlQuery?: string;
    stages?: Record<string, JourneyStage>;
  } = {},
) {
  const bookings = options.bookings ?? ALL_BOOKINGS;
  render(
    <MemoryRouter initialEntries={[`/coach${options.urlQuery ?? ''}`]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <SeedBookings bookings={bookings} />
              <AdvanceJourneys stages={options.stages ?? {}} />
              <AssessmentCallsSection
                bookings={bookings}
                now={NOW}
                timeZone={TIME_ZONE}
              />
              <LocationProbe />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function currentLocation(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

function callRows(): HTMLElement[] {
  return within(
    screen.getByRole('list', { name: 'Assessment calls' }),
  ).getAllByRole('listitem');
}

function listedNames(): string[] {
  return callRows().map(
    (item) => within(item).getByRole('heading', { level: 2 }).textContent ?? '',
  );
}

function whenTab(name: string): HTMLElement {
  return screen.getByRole('tab', { name });
}

async function chooseWhen(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(whenTab(name));
}

function statusSelect(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Status' });
}

async function chooseJourneyOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(statusSelect());
  await user.click(
    await screen.findByRole('option', {
      name: new RegExp(`^${label}( \\d+)?$`),
    }),
  );
}

describe('the assessment calls section', () => {
  it("shows each visitor's age, gender, goal, country and phone on her card", () => {
    // arrange
    renderSection();

    // act
    const [maria, ioana] = callRows();

    // assert
    expect(
      within(maria)
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Age', 'Gender', 'Goal', 'Country']);
    expect(
      within(maria)
        .getAllByRole('definition')
        .map((definition) => definition.textContent),
    ).toEqual(['32 (14 Mar 1994)', 'Female', 'Lose weight', 'Romania']);
    expect(
      within(maria).getByRole('link', { name: '+40712345678' }),
    ).toHaveAttribute('href', 'tel:+40712345678');
    expect(within(ioana).queryByRole('link', { name: /^\+/ })).toBeNull();
  });

  it('finds a visitor by her last name alone', async () => {
    // arrange
    const user = renderSection();

    // act
    await user.type(screen.getByLabelText('Search calls'), 'Radu');

    // assert
    expect(listedNames()).toEqual(['Ioana Radu']);
  });

  it('opens on every call, the upcoming ones first', () => {
    // arrange
    renderSection();

    // act
    const names = listedNames();

    // assert
    expect(whenTab('All')).toHaveAttribute('aria-selected', 'true');
    expect(names).toEqual([
      'Maria Ionescu',
      'Ioana Radu',
      'Sofia Dinu',
      'Elena Marin',
    ]);
  });

  it('shows the visitor email as a mail link and the notes as written', () => {
    // arrange
    renderSection();

    // act
    const item = callRows()[0];

    // assert
    expect(
      within(item).getByRole('link', { name: 'maria@example.com' }),
    ).toHaveAttribute('href', 'mailto:maria@example.com');
    expect(
      within(item).getByText(/Shoulder injury last year\./),
    ).toHaveTextContent(
      'Training three times a week. Shoulder injury last year.',
    );
  });

  it('offers a join link while the call has not ended and none once it has', async () => {
    // arrange
    const user = renderSection();

    // act
    const upcomingItem = callRows()[0];
    await chooseWhen(user, 'Past');
    const pastItem = callRows()[0];

    // assert
    expect(
      within(upcomingItem).getByRole('link', { name: 'Join call' }),
    ).toHaveAttribute('href', `/book/${LATER_TODAY.id}/join`);
    expect(
      within(pastItem).queryByRole('link', { name: 'Join call' }),
    ).toBeNull();
  });

  it('badges every call that starts today, ended or not', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Today');
    const items = callRows();

    // assert
    expect(listedNames()).toEqual(['Maria Ionescu', 'Sofia Dinu']);
    expect(within(items[0]).getByText('Today')).toBeInTheDocument();
    expect(within(items[1]).getByText('Today')).toBeInTheDocument();
  });

  it('keeps a call later today out of upcoming, since it belongs under today', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Upcoming');

    // assert
    expect(listedNames()).toEqual(['Ioana Radu']);
  });

  it('marks an ended call as held instead of offering it an action', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Past');
    const pastItem = callRows()[0];

    // assert
    expect(within(pastItem).getByText('Call held')).toBeInTheDocument();
    expect(
      within(pastItem).queryByRole('link', { name: 'Join call' }),
    ).toBeNull();
  });

  it('still offers a way to reach the visitor after the call has ended', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Past');
    const pastItem = callRows()[0];

    // assert
    expect(
      within(pastItem).getByRole('link', { name: 'sofia@example.com' }),
    ).toHaveAttribute('href', 'mailto:sofia@example.com');
  });

  it('lists past calls most recent first', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Past');

    // assert
    expect(listedNames()).toEqual(['Sofia Dinu', 'Elena Marin']);
  });

  it('lists the upcoming calls before the past ones under all', async () => {
    // arrange
    const user = renderSection();
    await chooseWhen(user, 'Past');

    // act
    await chooseWhen(user, 'All');

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
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');

    // assert
    expect(whenTab('Past')).toHaveFocus();
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
    expect(listedNames()).toEqual([
      'Maria Ionescu',
      'Ioana Radu',
      'Sofia Dinu',
      'Elena Marin',
    ]);
  });

  it('searches within the chosen filter only', async () => {
    // arrange
    const user = renderSection();
    await chooseWhen(user, 'Upcoming');

    // act
    await user.type(screen.getByLabelText('Search calls'), 'Elena');

    // assert
    expect(screen.getByText('No calls match your search.')).toBeInTheDocument();

    // act
    await chooseWhen(user, 'Past');

    // assert
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('writes the filter and the search to the URL without stacking history', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseWhen(user, 'Past');
    await user.type(screen.getByLabelText('Search calls'), 'elena');

    // assert
    expect(currentLocation()).toBe('?when=past&q=elena REPLACE');
  });

  it('keeps the default filter and an empty search out of the URL', async () => {
    // arrange
    const user = renderSection({ urlQuery: '?when=past&q=elena' });

    // act
    await user.clear(screen.getByLabelText('Search calls'));
    await chooseWhen(user, 'All');

    // assert
    expect(currentLocation()).toBe(' REPLACE');
  });

  it('opens on the filter and search the URL carries', () => {
    // arrange
    renderSection({ urlQuery: '?when=all&q=marin' });

    // act
    const search = screen.getByLabelText('Search calls');

    // assert
    expect(whenTab('All')).toHaveAttribute('aria-selected', 'true');
    expect(search).toHaveValue('marin');
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('falls back to all when the URL carries an unknown filter', () => {
    // arrange
    renderSection({ urlQuery: '?when=yesterday' });

    // act
    const allTab = whenTab('All');

    // assert
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(listedNames()).toEqual([
      'Maria Ionescu',
      'Ioana Radu',
      'Sofia Dinu',
      'Elena Marin',
    ]);
  });

  it('says there is nothing upcoming when every call has ended', () => {
    // arrange
    renderSection({ bookings: [YESTERDAY], urlQuery: '?when=upcoming' });

    // act
    const message = screen.getByText('No upcoming calls.');

    // assert
    expect(message).toBeInTheDocument();
  });

  it('says there is nothing today when no call starts today', async () => {
    // arrange
    const user = renderSection({ bookings: [TOMORROW] });

    // act
    await chooseWhen(user, 'Today');

    // assert
    expect(screen.getByText('No calls today.')).toBeInTheDocument();
  });

  it('says there is nothing past when no call has ended', async () => {
    // arrange
    const user = renderSection({ bookings: [TOMORROW] });

    // act
    await chooseWhen(user, 'Past');

    // assert
    expect(screen.getByText('No past calls.')).toBeInTheDocument();
  });

  it('says there are no calls yet when none is booked', async () => {
    // arrange
    const user = renderSection({ bookings: [] });

    // act
    await chooseWhen(user, 'All');

    // assert
    expect(screen.getByText('No calls yet')).toBeInTheDocument();
    expect(
      screen.getByText('Booked assessment calls appear here.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();
  });
});

describe('sorting the assessment call list', () => {
  function sortSelect(): HTMLElement {
    return screen.getByRole('combobox', { name: 'Sort by' });
  }

  async function chooseSort(
    user: ReturnType<typeof userEvent.setup>,
    option: string,
  ) {
    await user.click(sortSelect());
    await user.click(await screen.findByRole('option', { name: option }));
  }

  it('opens sorted by the scheduled date, soonest first', () => {
    // arrange
    renderSection();

    // act
    const toggle = screen.getByRole('button', { name: 'Soonest first' });

    // assert
    expect(sortSelect()).toHaveTextContent('Scheduled date: soonest first');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('orders the calls A to Z by name and writes the sort to the URL', async () => {
    // arrange
    const user = renderSection();

    // act
    await chooseSort(user, 'Name');

    // assert
    expect(listedNames()).toEqual([
      'Elena Marin',
      'Ioana Radu',
      'Maria Ionescu',
      'Sofia Dinu',
    ]);
    expect(currentLocation()).toBe('?sort=name REPLACE');
    expect(screen.getByRole('button', { name: 'A to Z' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reverses the order from the direction toggle and writes it to the URL', async () => {
    // arrange
    const user = renderSection({ urlQuery: '?sort=name' });

    // act
    await user.click(screen.getByRole('button', { name: 'A to Z' }));

    // assert
    expect(listedNames()).toEqual([
      'Sofia Dinu',
      'Maria Ionescu',
      'Ioana Radu',
      'Elena Marin',
    ]);
    expect(currentLocation()).toBe('?sort=name&dir=desc REPLACE');
    expect(screen.getByRole('button', { name: 'Z to A' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lists the newest booking first by the booking date', async () => {
    // arrange
    const user = renderSection({
      bookings: [
        bookingAt(localInstant(22, 18), {
          firstName: 'Booked',
          lastName: 'last week',
          bookedAt: localInstant(14, 10),
        }),
        bookingAt(localInstant(24, 18), {
          firstName: 'Booked',
          lastName: 'yesterday',
          bookedAt: localInstant(20, 10),
        }),
      ],
    });

    // act
    await chooseSort(user, 'Booking date');

    // assert
    expect(listedNames()).toEqual(['Booked yesterday', 'Booked last week']);
    expect(
      screen.getByRole('button', { name: 'Newest first' }),
    ).toBeInTheDocument();
  });

  it('drops the direction when the coach picks another sort', async () => {
    // arrange
    const user = renderSection({ urlQuery: '?sort=name&dir=desc' });

    // act
    await chooseSort(user, 'Email');

    // assert
    expect(currentLocation()).toBe('?sort=email REPLACE');
    expect(screen.getByRole('button', { name: 'A to Z' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps the default sort out of the URL', async () => {
    // arrange
    const user = renderSection({ urlQuery: '?sort=email&dir=desc' });

    // act
    await chooseSort(user, 'Scheduled date');

    // assert
    expect(currentLocation()).toBe(' REPLACE');
  });

  it('returns to the first page when the coach changes the sort', async () => {
    // arrange
    const user = renderSection({
      bookings: MANY_UPCOMING,
      urlQuery: '?page=3',
    });

    // act
    await user.click(screen.getByRole('button', { name: 'Soonest first' }));

    // assert
    expect(currentLocation()).toBe('?dir=asc REPLACE');
    expect(listedNames()[0]).toBe('Visitor 23');
  });
});

describe('paging a long assessment call list', () => {
  it('shows the first ten calls and says how many there are', () => {
    // arrange
    renderSection({ bookings: MANY_UPCOMING });

    // act
    const rows = callRows();

    // assert
    expect(rows).toHaveLength(10);
    expect(screen.getByText('Showing 1–10 of 23')).toBeInTheDocument();
    expect(listedNames()[0]).toBe('Visitor 1');
  });

  it('moves to another page from the numbered controls', async () => {
    // arrange
    const user = renderSection({ bookings: MANY_UPCOMING });

    // act
    await user.click(screen.getByRole('link', { name: 'Go to page 3' }));

    // assert
    expect(listedNames()[0]).toBe('Visitor 21');
    expect(screen.getByText('Showing 21–23 of 23')).toBeInTheDocument();
    expect(currentLocation()).toBe('?page=3 REPLACE');
  });

  it('opens on the page the URL carries and keeps the first page out of it', async () => {
    // arrange
    const user = renderSection({
      bookings: MANY_UPCOMING,
      urlQuery: '?page=2',
    });

    // assert
    expect(listedNames()[0]).toBe('Visitor 11');
    expect(screen.getByRole('link', { name: 'Go to page 3' })).toHaveAttribute(
      'href',
      '/coach?page=3',
    );
    expect(screen.getByRole('link', { name: 'Go to page 1' })).toHaveAttribute(
      'href',
      '/coach',
    );

    // act
    await user.click(screen.getByRole('link', { name: 'Go to page 1' }));

    // assert
    expect(currentLocation()).toBe(' REPLACE');
  });

  it('falls back to the last page when the URL asks for one past the end', () => {
    // arrange
    renderSection({ bookings: MANY_UPCOMING, urlQuery: '?page=99' });

    // act
    const rows = callRows();

    // assert
    expect(rows).toHaveLength(3);
    expect(screen.getByText('Showing 21–23 of 23')).toBeInTheDocument();
  });

  it('returns to the first page when the coach searches', async () => {
    // arrange
    const user = renderSection({
      bookings: MANY_UPCOMING,
      urlQuery: '?page=3',
    });

    // act
    await user.type(screen.getByLabelText('Search calls'), 'visitor1');

    // assert
    expect(currentLocation()).toBe('?q=visitor1 REPLACE');
    expect(screen.getByText('Showing 1–10 of 11')).toBeInTheDocument();
  });

  it('returns to the first page when the coach changes the filter', async () => {
    // arrange
    const user = renderSection({
      bookings: MANY_UPCOMING,
      urlQuery: '?page=3',
    });

    // act
    await chooseWhen(user, 'Upcoming');

    // assert
    expect(currentLocation()).toBe('?when=upcoming REPLACE');
    expect(screen.getByText('Showing 1–10 of 23')).toBeInTheDocument();
  });

  it('shows the step to the previous page as disabled, not a link, on the first page', () => {
    // arrange
    renderSection({ bookings: MANY_UPCOMING });

    // act
    const previous = screen.getByRole('button', {
      name: 'Go to previous page',
    });

    // assert
    expect(previous).toBeDisabled();
    expect(
      screen.queryByRole('link', { name: 'Go to previous page' }),
    ).toBeNull();
    expect(listedNames()[0]).toBe('Visitor 1');
  });

  it('shows the step to the next page as disabled, not a link, on the last page', () => {
    // arrange
    renderSection({ bookings: MANY_UPCOMING, urlQuery: '?page=3' });

    // act
    const next = screen.getByRole('button', { name: 'Go to next page' });

    // assert
    expect(next).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Go to next page' })).toBeNull();
    expect(screen.getByText('Showing 21–23 of 23')).toBeInTheDocument();
  });

  it('hides the whole pager footer when everything fits on one page', () => {
    // arrange
    renderSection();

    // act
    const pager = screen.queryByRole('navigation', { name: 'pagination' });

    // assert
    expect(pager).toBeNull();
    expect(screen.queryByText(/^Showing /)).toBeNull();
  });
});

describe('filtering assessment calls by journey step', () => {
  function renderJourneys(urlQuery: string) {
    return renderSection({
      bookings: JOURNEY_BOOKINGS,
      stages: JOURNEY_STAGES,
      urlQuery,
    });
  }

  it('counts the calls waiting at each step within the chosen window', async () => {
    // arrange
    const user = renderJourneys('?when=all');
    expect(statusSelect()).toHaveTextContent('All statuses');

    // act
    await user.click(statusSelect());

    // assert
    expect(
      await screen.findByRole('option', { name: 'All statuses 5' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Call held 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Payment link sent 1' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Paid 1' })).toBeInTheDocument();
  });

  it('counts only within the window the coach is looking at', async () => {
    // arrange
    const user = renderJourneys('?when=upcoming');

    // act
    await user.click(statusSelect());

    // assert
    expect(
      await screen.findByRole('option', { name: 'All statuses 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Payment link sent 0' }),
    ).toBeInTheDocument();
  });

  it('narrows the list to one step and writes it to the URL', async () => {
    // arrange
    const user = renderJourneys('?when=all');

    // act
    await chooseJourneyOption(user, 'Payment link sent');

    // assert
    expect(listedNames()).toEqual(['Elena Marin']);
    expect(currentLocation()).toBe(
      '?when=all&status=payment-link-sent REPLACE',
    );
  });

  it('leaves a call with no journey step to the all-statuses option only', async () => {
    // arrange
    const user = renderJourneys('?when=all');

    // act
    await chooseJourneyOption(user, 'Paid');

    // assert
    expect(listedNames()).toEqual(['Carmen Iliescu']);
    expect(listedNames()).not.toContain('Ioana Radu');
  });

  it('keeps the all-statuses option out of the URL when the coach goes back to it', async () => {
    // arrange
    const user = renderJourneys('?when=all&status=paid');

    // act
    await chooseJourneyOption(user, 'All statuses');

    // assert
    expect(currentLocation()).toBe('?when=all REPLACE');
    expect(listedNames()).toHaveLength(5);
  });

  it('opens on the journey step the URL carries', () => {
    // arrange
    renderJourneys('?when=all&status=payment-link-sent');

    // assert
    expect(statusSelect()).toHaveTextContent('Payment link sent');
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('combines the journey step with the search', async () => {
    // arrange
    const user = renderJourneys('?when=all&status=payment-link-sent');

    // act
    await user.type(screen.getByLabelText('Search calls'), 'carmen');

    // assert
    expect(screen.getByText('No calls match your search.')).toBeInTheDocument();
  });

  it('says which step and window came up empty', () => {
    // arrange
    renderJourneys('?when=upcoming&status=payment-link-sent');

    // act
    const message = screen.getByText(
      'No upcoming calls match the Payment link sent status.',
    );

    // assert
    expect(message).toBeInTheDocument();
  });

  it('returns to the first page when the coach picks a step', async () => {
    // arrange
    const user = renderSection({
      bookings: MANY_UPCOMING,
      urlQuery: '?page=3',
    });

    // act
    await chooseJourneyOption(user, 'Paid');

    // assert
    expect(currentLocation()).toBe('?status=paid REPLACE');
  });

  it('offers a way to clear every filter once one narrows the list to nothing, and resets the URL', async () => {
    // arrange
    const user = renderJourneys('?when=all&status=payment-link-sent');
    await user.type(screen.getByLabelText('Search calls'), 'carmen');
    expect(screen.getByText('No calls match your search.')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(currentLocation()).toBe(' REPLACE');
    expect(listedNames()).toHaveLength(5);
  });
});
