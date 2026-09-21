import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const TWO_DAYS_AGO = bookingAt(localInstant(19, 18), {
  visitorName: 'Dana Pop',
  visitorEmail: 'dana@example.com',
});
const THREE_DAYS_AGO = bookingAt(localInstant(18, 18), {
  visitorName: 'Carmen Iliescu',
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
  [TWO_DAYS_AGO.id]: 'paid',
  [THREE_DAYS_AGO.id]: 'invited',
};

const REACHABLE_STAGES: JourneyStage[] = [
  'held',
  'payment-link-sent',
  'paid',
  'invited',
];

const DAY_MS = 24 * 60 * 60 * 1000;

const MANY_UPCOMING = Array.from({ length: 23 }, (_, index) =>
  bookingAt(new Date(NOW.getTime() + (index + 1) * DAY_MS), {
    visitorName: `Visitor ${index + 1}`,
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

vi.mock('../DateRangeField', () => ({
  DateRangeField: ({
    value,
    onChange,
  }: {
    value: { from: string | null; to: string | null };
    onChange: (range: { from: string | null; to: string | null }) => void;
  }) => (
    <>
      <input
        aria-label="From"
        value={value.from ?? ''}
        onChange={(event) =>
          onChange({ from: event.target.value || null, to: value.to })
        }
      />
      <input
        aria-label="To"
        value={value.to ?? ''}
        onChange={(event) =>
          onChange({ from: value.from, to: event.target.value || null })
        }
      />
    </>
  ),
}));

function AdvanceJourneys({ stages }: { stages: Record<string, JourneyStage> }) {
  const { journeys, recordPaymentLinkSent, recordPaid, recordInvitation } =
    useClientJourneys();

  useEffect(() => {
    for (const [callId, target] of Object.entries(stages)) {
      const journey = journeys[callId];
      if (!journey) continue;

      const reached = REACHABLE_STAGES.indexOf(journey.stage);
      if (reached < 0 || reached >= REACHABLE_STAGES.indexOf(target)) continue;

      if (reached === 0) {
        recordPaymentLinkSent(callId, { token: `pl-${callId}`, sentAt: NOW });
      } else if (reached === 1) {
        recordPaid(callId, {
          paidAt: NOW,
          bundle: 3,
          startPath: 'immediate',
        });
      } else {
        recordInvitation(callId, {
          token: `inv-${callId}`,
          email: journey.identity.email,
          sentAt: NOW,
          expiresAt: NOW,
          replaced: false,
        });
      }
    }
  }, [journeys, stages, recordPaymentLinkSent, recordPaid, recordInvitation]);

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
  return callRows()
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
    const item = callRows()[0];

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
    const upcomingItem = callRows()[0];
    await selectTab(user, 'Past');
    const pastItem = callRows()[0];

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
    const items = callRows();

    // assert
    expect(listedNames()).toEqual(['Maria Ionescu', 'Sofia Dinu']);
    expect(within(items[0]).getByText('Today')).toBeInTheDocument();
    expect(within(items[1]).getByText('Today')).toBeInTheDocument();
  });

  it('marks an ended call as held instead of offering it an action', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');
    const pastItem = callRows()[0];

    // assert
    expect(within(pastItem).getByText('Call held')).toBeInTheDocument();
    expect(within(pastItem).queryByRole('link', { name: 'Join call' })).toBeNull();
  });

  it('still offers a way to reach the visitor after the call has ended', async () => {
    // arrange
    const user = renderSection();

    // act
    await selectTab(user, 'Past');
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
    const user = renderSection({ bookings: MANY_UPCOMING, urlQuery: '?page=2' });

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
    const user = renderSection({ bookings: MANY_UPCOMING, urlQuery: '?page=3' });

    // act
    await user.type(screen.getByLabelText('Search calls'), 'visitor1');

    // assert
    expect(currentLocation()).toBe('?q=visitor1 REPLACE');
    expect(screen.getByText('Showing 1–10 of 11')).toBeInTheDocument();
  });

  it('returns to the first page when the coach changes the filter', async () => {
    // arrange
    const user = renderSection({ bookings: MANY_UPCOMING, urlQuery: '?page=3' });

    // act
    await selectTab(user, 'All');

    // assert
    expect(currentLocation()).toBe('?status=all REPLACE');
    expect(screen.getByText('Showing 1–10 of 23')).toBeInTheDocument();
  });

  it('shows the step to the previous page as disabled, not a link, on the first page', () => {
    // arrange
    renderSection({ bookings: MANY_UPCOMING });

    // act
    const previous = screen.getByRole('button', { name: 'Go to previous page' });

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

  it('counts the calls waiting at each step within the chosen window', () => {
    // arrange
    renderJourneys('?status=all');

    // act
    const group = screen.getByRole('group', { name: 'Journey' });

    // assert
    expect(within(group).getByRole('button', { name: 'Any 5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(group).getByRole('button', { name: 'Payment link sent 1' }),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole('button', { name: 'Paid 1' }),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole('button', { name: 'Invited 1' }),
    ).toBeInTheDocument();
  });

  it('counts only within the window the coach is looking at', () => {
    // arrange
    renderJourneys('');

    // act
    const group = screen.getByRole('group', { name: 'Journey' });

    // assert
    expect(
      within(group).getByRole('button', { name: 'Any 1' }),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole('button', { name: 'Payment link sent 0' }),
    ).toBeInTheDocument();
  });

  it('narrows the list to one step and writes it to the URL', async () => {
    // arrange
    const user = renderJourneys('?status=all');

    // act
    await user.click(screen.getByRole('button', { name: 'Paid 1' }));

    // assert
    expect(listedNames()).toEqual(['Dana Pop']);
    expect(currentLocation()).toBe('?status=all&journey=paid REPLACE');
  });

  it('leaves a call with no action yet to the any chip', async () => {
    // arrange
    const user = renderJourneys('?status=all');

    // act
    await user.click(screen.getByRole('button', { name: 'Invited 1' }));

    // assert
    expect(listedNames()).toEqual(['Carmen Iliescu']);
    expect(listedNames()).not.toContain('Sofia Dinu');
  });

  it('keeps the any chip out of the URL when the coach goes back to it', async () => {
    // arrange
    const user = renderJourneys('?status=all&journey=paid');

    // act
    await user.click(screen.getByRole('button', { name: 'Any 5' }));

    // assert
    expect(currentLocation()).toBe('?status=all REPLACE');
    expect(listedNames()).toHaveLength(5);
  });

  it('opens on the journey step the URL carries', () => {
    // arrange
    renderJourneys('?status=all&journey=payment-link-sent');

    // act
    const chip = screen.getByRole('button', { name: 'Payment link sent 1' });

    // assert
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(listedNames()).toEqual(['Elena Marin']);
  });

  it('combines the journey step with the search', async () => {
    // arrange
    const user = renderJourneys('?status=all&journey=paid');

    // act
    await user.type(screen.getByLabelText('Search calls'), 'carmen');

    // assert
    expect(screen.getByText('No calls match your search.')).toBeInTheDocument();
  });

  it('says which step and window came up empty', () => {
    // arrange
    renderJourneys('?journey=payment-link-sent');

    // act
    const message = screen.getByText(
      'No upcoming calls with a payment link sent.',
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
    await user.click(screen.getByRole('button', { name: 'Invited 0' }));

    // assert
    expect(currentLocation()).toBe('?journey=invited REPLACE');
  });
});

describe('filtering assessment calls by a custom date range', () => {
  function renderCustom(urlQuery: string) {
    return renderSection({
      bookings: JOURNEY_BOOKINGS,
      stages: JOURNEY_STAGES,
      urlQuery,
    });
  }

  it('asks for both days and holds nothing back until they are picked', () => {
    // arrange
    renderCustom('?status=custom');

    // act
    const hint = screen.getByText('Pick a start and end date.');

    // assert
    expect(hint).toBeInTheDocument();
    expect(listedNames()).toHaveLength(5);
  });

  it('offers the range picker only under the custom window', async () => {
    // arrange
    const user = renderCustom('');

    // assert
    expect(screen.queryByLabelText('From')).toBeNull();

    // act
    await user.click(screen.getByRole('tab', { name: 'Custom' }));

    // assert
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });

  it('writes the picked days to the URL and keeps both of them', () => {
    // arrange
    renderCustom('?status=custom');

    // act
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-09-18' },
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-09-20' },
    });

    // assert
    expect(currentLocation()).toBe(
      '?status=custom&from=2026-09-18&to=2026-09-20 REPLACE',
    );
  });

  it('opens on the range the URL carries, both days included', () => {
    // arrange
    renderCustom('?status=custom&from=2026-09-18&to=2026-09-20');

    // act
    const names = listedNames();

    // assert
    expect(screen.getByRole('tab', { name: 'Custom' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(names).toEqual(['Carmen Iliescu', 'Dana Pop', 'Elena Marin']);
  });

  it('names the picked days when nothing falls inside them', () => {
    // arrange
    renderCustom('?status=custom&from=2026-09-12&to=2026-09-16');

    // act
    const message = screen.getByText('No calls between 12 and 16 September.');

    // assert
    expect(message).toBeInTheDocument();
  });

  it('combines the range with the journey step', () => {
    // arrange
    renderCustom('?status=custom&from=2026-09-18&to=2026-09-20&journey=paid');

    // act
    const names = listedNames();

    // assert
    expect(names).toEqual(['Dana Pop']);
  });
});
