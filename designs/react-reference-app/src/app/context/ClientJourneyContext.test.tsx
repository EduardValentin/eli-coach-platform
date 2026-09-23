import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from './AppContext';
import { AssessmentCallProvider } from './AssessmentCallContext';
import { ClientProfileProvider } from './ClientProfileContext';
import {
  ClientJourneyProvider,
  DEMO_JOURNEY_CALL_ID,
  useClientJourneys,
} from './ClientJourneyContext';

function JourneyProbe() {
  const { demoJourney, recordPaymentLinkSent, recordInvitation } =
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
          recordInvitation(DEMO_JOURNEY_CALL_ID, {
            token: 'inv-first',
            email: 'jane@example.com',
            sentAt: new Date(),
            expiresAt: new Date(),
            replaced: false,
          })
        }
      >
        send invitation
      </button>
      <button
        type="button"
        onClick={() =>
          recordInvitation(DEMO_JOURNEY_CALL_ID, {
            token: 'inv-second',
            email: 'jane@example.com',
            sentAt: new Date(),
            expiresAt: new Date(),
            replaced: true,
          })
        }
      >
        re-send invitation
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

describe('re-sending the invitation', () => {
  it('replaces the stored invitation and keeps the invited stage', async () => {
    // arrange
    const user = renderProbe('paid');
    await user.click(screen.getByRole('button', { name: 'send invitation' }));
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');

    // act
    await user.click(
      screen.getByRole('button', { name: 're-send invitation' }),
    );

    // assert
    expect(screen.getByLabelText('stage')).toHaveTextContent('invited');
    expect(screen.getByLabelText('invitation token')).toHaveTextContent(
      'inv-second',
    );
  });
});
