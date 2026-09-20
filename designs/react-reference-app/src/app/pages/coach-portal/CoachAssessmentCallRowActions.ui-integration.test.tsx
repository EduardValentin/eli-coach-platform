import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const VISITOR = 'Maria Ionescu';
const VISITOR_EMAIL = 'maria@example.com';
const WAIT = { timeout: 4000 };

function bookingAt(id: string, startsAt: Date): PrototypeBooking {
  return {
    id,
    startsAt,
    visitorName: VISITOR,
    visitorEmail: VISITOR_EMAIL,
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
      <button
        type="button"
        onClick={() => recordAccountCreated(BOOKING.id)}
      >
        driver: create account
      </button>
    </>
  );
}

function heldCallsQuery(urlQuery: string) {
  if (urlQuery.includes('status=')) return urlQuery;
  return `?status=past${urlQuery.replace(/^\?/, '&')}`;
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

async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: `Journey actions for ${VISITOR}` }),
  );
}

async function sendPaymentLink(user: ReturnType<typeof userEvent.setup>) {
  await openRowMenu(user);
  await user.click(screen.getByRole('menuitem', { name: 'Send payment link' }));
}

async function sendInvitation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'driver: mark paid' }));
  await openRowMenu(user);
  await user.click(screen.getByRole('menuitem', { name: 'Invite' }));
  await user.click(screen.getByRole('button', { name: 'Send invitation' }));
}

describe('the assessment call row actions', () => {
  it('offers the journey actions only once the call has taken place', () => {
    // arrange
    const urlQuery = '?status=past';

    // act
    renderPage(urlQuery);

    // assert
    expect(screen.getByText('Call held')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Journey actions for/ }),
    ).toBeInTheDocument();
  });

  it('keeps an upcoming call free of journey status and actions', () => {
    // arrange
    const urlQuery = '?status=upcoming';

    // act
    renderPage(urlQuery);

    // assert
    expect(screen.getByRole('link', { name: 'Join call' })).toBeInTheDocument();
    expect(screen.queryByText('Call held')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Journey actions for/ }),
    ).toBeNull();
  });

  it('sends the payment link from the row and confirms the send', async () => {
    // arrange
    const user = renderPage();

    // act
    await sendPaymentLink(user);

    // assert
    expect(
      await screen.findByText(
        `Payment link sent to ${VISITOR_EMAIL}.`,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Payment link sent')).toBeInTheDocument();
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

  it('keeps the invitation out of reach until she has paid', async () => {
    // arrange
    const user = renderPage();

    // act
    await openRowMenu(user);

    // assert
    expect(screen.getByRole('menuitem', { name: /Invite/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText('Available once she has paid.')).toBeInTheDocument();
  });

  it('opens the invitation form on the booking details once she has paid', async () => {
    // arrange
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: 'driver: mark paid' }));

    // act
    await openRowMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Invite' }));

    // assert
    expect(screen.getByLabelText('First name')).toHaveValue('Maria');
    expect(screen.getByLabelText('Last name')).toHaveValue('Ionescu');
    expect(screen.getByLabelText('Email')).toHaveValue(VISITOR_EMAIL);
    expect(screen.getByLabelText('Phone (optional)')).toHaveValue('');
  });

  it('says what the invitation link does once it is sent', async () => {
    // arrange
    const user = renderPage();

    // act
    await sendInvitation(user);

    // assert
    expect(
      await screen.findByText(
        new RegExp(`Invitation sent to ${VISITOR_EMAIL}`),
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/opening the email is not enough/i),
    ).toBeInTheDocument();
  });

  it('tells her the earlier invitation stopped working when one is replaced', async () => {
    // arrange
    const user = renderPage('?invitation=replaced');

    // act
    await sendInvitation(user);

    // assert
    expect(
      await screen.findByText(
        /Her earlier invitation no longer works\./,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it('refuses an email that already belongs to a client and keeps the form', async () => {
    // arrange
    const user = renderPage('?invitation=already-client');

    // act
    await sendInvitation(user);

    // assert
    expect(
      await screen.findByText(
        'This email already belongs to a client.',
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue(VISITOR_EMAIL);
  });

  it('says the invitation was saved when the email could not be sent', async () => {
    // arrange
    const user = renderPage('?invitation=delivery-failure');

    // act
    await sendInvitation(user);

    // assert
    expect(
      await screen.findByText(
        'Saved, but the email could not be sent. Try again in a moment.',
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it('leaves only the prototype shortcuts once she has created her account', async () => {
    // arrange
    const user = renderPage();
    await sendPaymentLink(user);
    await screen.findByText('Payment link sent', {}, WAIT);
    await sendInvitation(user);
    await screen.findByRole('button', { name: 'Done' }, WAIT);
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // act
    await user.click(
      screen.getByRole('button', { name: 'driver: create account' }),
    );

    // assert
    expect(screen.getByText('Invitation accepted')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Journey actions for/ }),
    ).toBeNull();
  });
});
