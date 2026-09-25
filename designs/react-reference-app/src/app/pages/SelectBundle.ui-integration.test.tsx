import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { withdrawalDeadline } from '../domain/coachingSubscription';
import { formatJourneyDate } from '../utils/journeyLabels';
import { SelectBundle } from './SelectBundle';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';
import { StoreProvider } from '../context/StoreContext';
import { findCheckoutSession } from '../services/checkoutService';

const DEMO_TOKEN = 'pl-seed-ac-demo-client-1';
const WAIT = { timeout: 4000 };
const TEST_TIMEOUT_MS = 20000;
const START_QUESTION = 'When would you like your program to start?';
const IMMEDIATE_OPTION = /^Start as soon as my payment is confirmed\./;
const WAITING_OPTION = /^Start after the 14-day withdrawal period ends\./;
const START_REQUIRED = "Choose when you'd like your program to start.";

function CheckoutProbe() {
  const { sessionId = '' } = useParams();
  const session = findCheckoutSession(sessionId);

  return (
    <p data-testid="session-summary">
      {session ? `${session.bundle}:${session.startPath}` : 'missing'}
    </p>
  );
}

function renderPage(query: string) {
  window.history.replaceState({}, '', `/select-bundle${query}`);

  render(
    <MemoryRouter initialEntries={[`/select-bundle${query}`]}>
      <AppProvider>
        <StoreProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <Routes>
                  <Route element={<SelectBundle />} path="/select-bundle" />
                  <Route element={<CheckoutProbe />} path="/checkout/:sessionId" />
                </Routes>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('choosing a bundle from a payment link', () => {
  it('asks when her program should start without choosing for her', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}`);

    // act
    const group = await screen.findByRole(
      'radiogroup',
      { name: START_QUESTION },
      WAIT,
    );

    // assert
    expect(
      within(group).getByRole('radio', { name: IMMEDIATE_OPTION }),
    ).not.toBeChecked();
    expect(
      within(group).getByRole('radio', { name: WAITING_OPTION }),
    ).not.toBeChecked();
    expect(
      within(group).getByText(formatJourneyDate(withdrawalDeadline(new Date()))),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'See how this works in the terms' }),
    ).toHaveAttribute('href', '/terms#immediate-digital-delivery-and-withdrawal');
    expect(
      screen.getByText(
        /Each bundle is a subscription: it renews at its own length/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    ).toBeEnabled();
  }, TEST_TIMEOUT_MS);

  it('holds checkout back and points her at the start question until she answers it', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}`);
    const pay = await screen.findByRole(
      'button',
      { name: 'Continue to Checkout' },
      WAIT,
    );

    // act
    await userEvent.click(pay);

    // assert
    const group = screen.getByRole('radiogroup', { name: START_QUESTION });
    expect(group).toHaveAccessibleDescription(START_REQUIRED);
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: IMMEDIATE_OPTION })).toHaveFocus();
    expect(screen.queryByTestId('session-summary')).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('clears the start question error once she answers it', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}`);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Continue to Checkout' }, WAIT),
    );

    // act
    await userEvent.click(screen.getByRole('radio', { name: WAITING_OPTION }));

    // assert
    expect(screen.queryByText(START_REQUIRED)).not.toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: START_QUESTION }),
    ).not.toHaveAttribute('aria-invalid');
  }, TEST_TIMEOUT_MS);

  it('keeps the assessment-required state when the link has expired', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}&paylinkstate=expired`);

    // act
    const heading = await screen.findByRole(
      'heading',
      { name: 'A Call Comes First' },
      WAIT,
    );

    // assert
    expect(heading).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Continue to Checkout' }),
    ).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('carries the waiting start path when she keeps her 14 days', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}`);
    const waiting = await screen.findByRole(
      'radio',
      { name: WAITING_OPTION },
      WAIT,
    );

    // act
    await userEvent.click(waiting);
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    );

    // assert
    await waitFor(
      () =>
        expect(screen.getByTestId('session-summary')).toHaveTextContent(
          '3:waiting',
        ),
      WAIT,
    );
  }, TEST_TIMEOUT_MS);

  it('carries the immediate start path when she asks to start right away', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}`);
    const immediate = await screen.findByRole(
      'radio',
      { name: IMMEDIATE_OPTION },
      WAIT,
    );

    // act
    await userEvent.click(immediate);
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue to Checkout' }),
    );

    // assert
    await waitFor(
      () =>
        expect(screen.getByTestId('session-summary')).toHaveTextContent(
          '3:immediate',
        ),
      WAIT,
    );
  }, TEST_TIMEOUT_MS);

  it('shows her reduced price when the journey earned one', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}&jreduced=1`);

    // act
    const badge = await screen.findByText(
      'Your reduced price — held for you',
      undefined,
      WAIT,
    );

    // assert
    expect(badge).toBeVisible();
    expect(screen.getByText('€125')).toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('reassures her and lets her dismiss the notice after a cancelled payment', async () => {
    // arrange
    renderPage(`?token=${DEMO_TOKEN}&payment=cancelled`);
    const notice = await screen.findByText(
      "No payment was taken. Pick a bundle whenever you're ready.",
      undefined,
      WAIT,
    );

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    // assert
    expect(notice).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);
});
