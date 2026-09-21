import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckoutStandIn } from './CheckoutStandIn';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';
import {
  createCheckoutSession,
  type CheckoutSession,
} from '../services/checkoutService';

const DEMO_TOKEN = 'pl-seed-ac-demo-client-1';
const WAIT = { timeout: 4000 };
const TEST_TIMEOUT_MS = 20000;

function JourneyProbe() {
  const { demoJourney } = useClientJourneys();
  const { pathname, search } = useLocation();

  return (
    <div>
      <span data-testid="route">{`${pathname}${search}`}</span>
      <span data-testid="stage">{demoJourney.stage}</span>
      <span data-testid="subscription">
        {demoJourney.subscription
          ? `${demoJourney.subscription.bundle}:${demoJourney.subscription.startPath}:${demoJourney.subscription.status}`
          : 'none'}
      </span>
    </div>
  );
}

function renderStandIn(session: CheckoutSession, devParams: string) {
  const url = `/checkout/${session.sessionId}${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <JourneyProbe />
              <Routes>
                <Route element={<CheckoutStandIn />} path="/checkout/:sessionId" />
                <Route element={<p>confirmation page</p>} path="/checkout/complete" />
                <Route element={<p>bundle page</p>} path="/select-bundle" />
              </Routes>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function openSession() {
  return createCheckoutSession(DEMO_TOKEN, { bundle: 3, startPath: 'waiting' });
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('the Stripe checkout stand-in', () => {
  it('records the payment and confirms it when the charge succeeds', async () => {
    // arrange
    const session = await openSession();
    renderStandIn(session, '?jstage=payment-link-sent');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Pay €447' }));

    // assert
    expect(await screen.findByText('confirmation page', undefined, WAIT)).toBeVisible();
    expect(screen.getByTestId('stage')).toHaveTextContent('paid');
    expect(screen.getByTestId('subscription')).toHaveTextContent(
      '3:waiting:not-started',
    );
  }, TEST_TIMEOUT_MS);

  it('sends her back to the bundles with a cancellation notice', async () => {
    // arrange
    const session = await openSession();
    renderStandIn(session, '?jstage=payment-link-sent');

    // act
    await userEvent.click(screen.getByRole('link', { name: 'Back' }));

    // assert
    expect(await screen.findByText('bundle page', undefined, WAIT)).toBeVisible();
    expect(screen.getByTestId('route')).toHaveTextContent(
      `/select-bundle?token=${DEMO_TOKEN}&payment=cancelled`,
    );
  }, TEST_TIMEOUT_MS);

  it('summarises the order and offers a way back', async () => {
    // arrange
    const session = await openSession();

    // act
    renderStandIn(session, '?jstage=payment-link-sent');

    // assert
    expect(screen.getByText('Stripe Checkout · prototype stand-in')).toBeVisible();
    expect(screen.getByText('Every 3 months')).toBeVisible();
    expect(
      screen.getByText(
        'Starts 14 days after payment, unless you ask to start sooner',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Card number')).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `/select-bundle?token=${DEMO_TOKEN}&payment=cancelled`,
    );
  }, TEST_TIMEOUT_MS);
});
