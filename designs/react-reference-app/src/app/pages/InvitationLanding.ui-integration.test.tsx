import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { InvitationLanding } from './InvitationLanding';
import { AppProvider, useAppState } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';

const DEMO_TOKEN = 'inv-seed-ac-demo-client-1';
const WAIT = { timeout: 4000 };
const TEST_TIMEOUT_MS = 20000;

function SessionProbe() {
  const { appState } = useAppState();
  const { demoJourney } = useClientJourneys();

  return (
    <div>
      <span data-testid="session">{appState.session}</span>
      <span data-testid="stage">{demoJourney.stage}</span>
    </div>
  );
}

function renderInvitation(devParams: string) {
  const url = `/invitation/${DEMO_TOKEN}${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <SessionProbe />
              <Routes>
                <Route element={<InvitationLanding />} path="/invitation/:token" />
                <Route element={<p>welcome page</p>} path="/portal/welcome" />
              </Routes>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('accepting an invitation', () => {
  it('hands her to the hosted sign-in and lands her on the welcome page', async () => {
    // arrange
    renderInvitation('?jstage=invited');
    const create = await screen.findByRole(
      'button',
      { name: 'Continue to create my account' },
      WAIT,
    );

    // act
    await userEvent.click(create);

    // assert
    expect(await screen.findByText('welcome page', undefined, WAIT)).toBeVisible();
    expect(screen.getByTestId('session')).toHaveTextContent('client');
    expect(screen.getByTestId('stage')).toHaveTextContent('account-created');
  }, TEST_TIMEOUT_MS);

  it('shows the invited email as a read-only field', async () => {
    // arrange
    renderInvitation('?jstage=invited');

    // act
    const email = await screen.findByLabelText('Email', undefined, WAIT);

    // assert
    expect(email).toHaveValue('jane@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByText('Your account uses this email')).toBeVisible();
  }, TEST_TIMEOUT_MS);

  it.each(['expired', 'used', 'unknown'])(
    'gives the same privacy-safe dead end for a %s link',
    async (linkState) => {
      // arrange
      renderInvitation(`?jstage=invited&invitationstate=${linkState}`);

      // act
      const heading = await screen.findByRole(
        'heading',
        { name: "This invitation isn't available" },
        WAIT,
      );

      // assert
      expect(heading).toBeVisible();
      expect(
        screen.getByText(
          'It may have expired or already been used. Ask your coach for a new one.',
        ),
      ).toBeVisible();
      expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
        'href',
        '/',
      );
    },
    TEST_TIMEOUT_MS,
  );
});
