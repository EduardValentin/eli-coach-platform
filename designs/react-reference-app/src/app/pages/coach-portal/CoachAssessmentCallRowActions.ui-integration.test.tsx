import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { subDays } from 'date-fns';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CoachAssessmentCalls } from './CoachAssessmentCalls';
import { AppProvider } from '../../context/AppContext';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from '../../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import type { PrototypeBooking } from '../../services/assessmentCallService';

const DAY_MS = 24 * 60 * 60 * 1000;
const VISITOR_FIRST_NAME = 'Maria';
const VISITOR_LAST_NAME = 'Ionescu';
const VISITOR = `${VISITOR_FIRST_NAME} ${VISITOR_LAST_NAME}`;
const VISITOR_EMAIL = 'maria@example.com';
const WAIT = { timeout: 4000 };

function bookingAt(id: string, startsAt: Date): PrototypeBooking {
  return {
    id,
    startsAt,
    bookedAt: subDays(startsAt, 3),
    firstName: VISITOR_FIRST_NAME,
    lastName: VISITOR_LAST_NAME,
    visitorEmail: VISITOR_EMAIL,
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${id}/join`,
  };
}

const BOOKING = bookingAt('ac-row-actions', new Date(Date.now() - DAY_MS));
const UPCOMING_BOOKING = bookingAt(
  'ac-row-actions-upcoming',
  new Date(Date.now() + DAY_MS),
);

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

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

function SeedBookings() {
  const { replaceBookings } = useAssessmentCalls();

  useEffect(() => {
    replaceBookings([BOOKING, UPCOMING_BOOKING]);
  }, [replaceBookings]);

  return null;
}

function JourneyDriver() {
  const { recordPaymentLinkSent, recordPaid, recordAccountCreated } =
    useClientJourneys();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          recordPaymentLinkSent(BOOKING.id, {
            token: 'pl-driver',
            sentAt: new Date(),
          });
          recordPaid(BOOKING.id, {
            paidAt: new Date(),
            bundle: 3,
            startPath: 'immediate',
          });
        }}
      >
        driver: mark paid
      </button>
      <button type="button" onClick={() => recordAccountCreated(BOOKING.id)}>
        driver: create account
      </button>
    </>
  );
}

function heldCallsQuery(urlQuery: string) {
  if (urlQuery.includes('when=')) return urlQuery;
  return `?when=past${urlQuery.replace(/^\?/, '&')}`;
}

function renderPage(urlQuery = '') {
  const query = heldCallsQuery(urlQuery);
  window.history.replaceState({}, '', `/coach/assessment-calls${query}`);

  render(
    <MemoryRouter initialEntries={[`/coach/assessment-calls${query}`]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <SeedBookings />
            <ClientJourneyProvider>
              <CoachAssessmentCalls />
              <JourneyDriver />
              <Toaster />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

function findStageBadge(label: string) {
  return within(
    screen.getByRole('list', { name: 'Assessment calls' }),
  ).findByText(label, {}, WAIT);
}

async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
  buttonName: string,
) {
  await user.click(screen.getByRole('button', { name: buttonName }));
  return screen.findByRole('dialog');
}

async function confirm(
  user: ReturnType<typeof userEvent.setup>,
  confirmLabel: string,
) {
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: confirmLabel }));
}

async function sendPaymentLink(user: ReturnType<typeof userEvent.setup>) {
  await openDialog(user, 'Send payment link');
  await confirm(user, 'Send link');
}

async function markPaid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'driver: mark paid' }));
}

describe('the assessment call row actions', () => {
  it('offers the journey actions only once the call has taken place', () => {
    // arrange
    const urlQuery = '?when=past';

    // act
    renderPage(urlQuery);

    // assert
    expect(screen.getByText('Call held')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send payment link' }),
    ).toBeInTheDocument();
  });

  it('keeps an upcoming call free of journey status and actions', () => {
    // arrange
    const urlQuery = '?when=upcoming';

    // act
    renderPage(urlQuery);

    // assert
    expect(screen.getByRole('link', { name: 'Join call' })).toBeInTheDocument();
    expect(screen.queryByText('Call held')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Send payment link' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Invite' })).toBeNull();
  });

  it('opens a confirmation dialog before sending the payment link', async () => {
    // arrange
    const user = renderPage();

    // act
    const dialog = await openDialog(user, 'Send payment link');

    // assert
    expect(
      within(dialog).getByRole('heading', { name: 'Send payment link?' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        `${VISITOR} gets an email with a link to choose her bundle and pay.`,
      ),
    ).toBeInTheDocument();
  });

  it('sends the payment link from the row and confirms the send', async () => {
    // arrange
    const user = renderPage();

    // act
    await sendPaymentLink(user);

    // assert
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      await screen.findByText(
        `Payment link sent to ${VISITOR_EMAIL}.`,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(await findStageBadge('Payment link sent')).toBeInTheDocument();
  });

  it('re-sends the payment link once one has already gone out', async () => {
    // arrange
    const user = renderPage();
    await sendPaymentLink(user);
    await findStageBadge('Payment link sent');

    // act
    const dialog = await openDialog(user, 'Re-send payment link');

    // assert
    expect(
      within(dialog).getByRole('heading', { name: 'Re-send payment link?' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        `A fresh link goes to ${VISITOR_EMAIL}. Her earlier link stops working.`,
      ),
    ).toBeInTheDocument();

    // act
    await confirm(user, 'Re-send link');

    // assert
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await findStageBadge('Payment link sent')).toBeInTheDocument();
    expect(
      (
        await screen.findAllByText(
          `Payment link sent to ${VISITOR_EMAIL}.`,
          {},
          WAIT,
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('says so when the payment link email does not go out', async () => {
    // arrange
    const user = renderPage('?paylink=delivery-failure');

    // act
    await sendPaymentLink(user);

    // assert
    expect(
      await screen.findByText(
        /the payment link was created, but the email could not be sent/i,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it('offers only the payment link until she has paid', () => {
    // arrange
    renderPage();

    // assert
    expect(
      screen.getByRole('button', { name: 'Send payment link' }),
    ).toBeInTheDocument();
  });

  it('moves straight to paid and leaves no journey action once she has paid', async () => {
    // arrange
    const user = renderPage();

    // act
    await markPaid(user);

    // assert
    expect(await findStageBadge('Paid')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send payment link' }),
    ).toBeNull();
  });

  it('still shows Paid and links to the client once she has created her account', async () => {
    // arrange
    const user = renderPage();
    await markPaid(user);
    await findStageBadge('Paid');

    // act
    await user.click(
      screen.getByRole('button', { name: 'driver: create account' }),
    );

    // assert
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View client' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send payment link' }),
    ).toBeNull();
  });
});
