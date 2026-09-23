import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from './AppContext';
import {
  AssessmentCallProvider,
  useAssessmentCalls,
} from './AssessmentCallContext';
import { ClientProfileProvider } from './ClientProfileContext';
import {
  ClientJourneyProvider,
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from './ClientJourneyContext';
import type { PrototypeBooking } from '../services/assessmentCallService';

function JourneyProbe() {
  const { demoJourney, recordPaymentLinkSent, recordPaid } =
    useClientJourneys();

  return (
    <>
      <output aria-label="stage">{demoJourney.stage}</output>
      <output aria-label="payment link token">
        {demoJourney.paymentLink?.token ?? ''}
      </output>
      <output aria-label="invitation token">
        {demoJourney.invitation?.token ?? ''}
      </output>
      <button
        type="button"
        onClick={() =>
          recordPaymentLinkSent(DEMO_JOURNEY_CALL_ID, {
            token: 'pl-first',
            sentAt: new Date(),
          })
        }
      >
        send payment link
      </button>
      <button
        type="button"
        onClick={() =>
          recordPaymentLinkSent(DEMO_JOURNEY_CALL_ID, {
            token: 'pl-second',
            sentAt: new Date(),
          })
        }
      >
        re-send payment link
      </button>
      <button
        type="button"
        onClick={() =>
          recordPaid(DEMO_JOURNEY_CALL_ID, {
            paidAt: new Date(),
            bundle: 3,
            startPath: 'immediate',
          })
        }
      >
        complete checkout
      </button>
    </>
  );
}

function renderProbe(jstage: string) {
  window.history.replaceState({}, '', `/?jstage=${jstage}`);

  render(
    <MemoryRouter initialEntries={[`/?jstage=${jstage}`]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <JourneyProbe />
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return userEvent.setup();
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

function demoIdBooking(): PrototypeBooking {
  return {
    id: DEMO_JOURNEY_CALL_ID,
    startsAt: new Date(2026, 8, 1, 17),
    bookedAt: new Date(2026, 7, 29, 17),
    firstName: 'Jane',
    lastName: 'Doe',
    visitorEmail: 'jane@example.com',
    dateOfBirth: '1993-05-14',
    gender: 'female',
    primaryGoal: 'lose_weight',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: 'Europe/Bucharest',
    coachTimeZone: 'Europe/Bucharest',
    joinPath: `/book/${DEMO_JOURNEY_CALL_ID}/join`,
  };
}

function SeedDemoIdBooking() {
  const { replaceBookings } = useAssessmentCalls();

  useEffect(() => {
    replaceBookings([demoIdBooking()]);
  }, [replaceBookings]);

  return null;
}

describe('syncing bookings into journeys', () => {
  it('keeps the seeded demo journey when a booking shares its id', () => {
    // arrange
    window.history.replaceState({}, '', '/?jstage=invited');

    render(
      <MemoryRouter initialEntries={['/?jstage=invited']}>
        <AppProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <SeedDemoIdBooking />
              <ClientJourneyProvider>
                <JourneyProbe />
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </AppProvider>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');
  });
});

describe('re-sending the payment link', () => {
  it('replaces the stored link and keeps the payment-link-sent stage', async () => {
    // arrange
    const user = renderProbe('held');
    await user.click(screen.getByRole('button', { name: 'send payment link' }));
    expect(screen.getByLabelText('stage')).toHaveTextContent(
      'payment-link-sent',
    );

    // act
    await user.click(
      screen.getByRole('button', { name: 're-send payment link' }),
    );

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent(
      'payment-link-sent',
    );
    expect(screen.getByLabelText('payment link token')).toHaveTextContent(
      'pl-second',
    );
  });
});

describe('completing checkout', () => {
  it('records the payment and creates her invitation in the same action', async () => {
    // arrange
    const user = renderProbe('payment-link-sent');

    // act
    await user.click(screen.getByRole('button', { name: 'complete checkout' }));

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');
    expect(screen.getByLabelText('invitation token')).not.toHaveTextContent('');
  });
});
