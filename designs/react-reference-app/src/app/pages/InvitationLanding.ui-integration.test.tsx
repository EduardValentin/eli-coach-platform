import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { InvitationLanding } from './InvitationLanding';
import { ClientOnboarding } from './client-portal/ClientOnboarding';
import { ClientWelcome } from './client-portal/ClientWelcome';
import { AppProvider, useAppState } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../context/ClientJourneyContext';
import { ClientJourneyGate } from '../components/client-portal/ClientJourneyGate';
import { ClientProfileProvider } from '../context/ClientProfileContext';
import { UnitPreferencesProvider } from '../context/UnitPreferencesContext';

const DEMO_TOKEN = 'inv-seed-ac-demo-client-1';
const INVITATION_STORAGE_KEY = 'invitation';
const WAIT = { timeout: 4000 };
const TEST_TIMEOUT_MS = 20000;
const CONTINUE = 'Continue to create my account';
const HAND_OFF_NOTE =
  "Your email is already confirmed by this invitation — there's no code to type. You'll create your account on Evoa's secure sign-up page and land straight in your account.";
const SIGNED_IN_TITLE = "You're already signed in";
const SIGNED_IN_BODY =
  'This invitation creates a new account. Sign out first, then open the link again.';

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

function invitationAddress(devParams: string) {
  return `/invitation${devParams}#${DEMO_TOKEN}`;
}

function renderInvitation(address: string) {
  window.history.replaceState({}, '', address);

  render(
    <MemoryRouter initialEntries={[address]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <SessionProbe />
              <Routes>
                <Route element={<InvitationLanding />} path="/invitation" />
                <Route element={<p>welcome page</p>} path="/portal/welcome" />
              </Routes>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderInvitationThroughPortal(address: string) {
  window.history.replaceState({}, '', address);

  render(
    <MemoryRouter initialEntries={[address]}>
      <AppProvider>
        <ClientProfileProvider>
          <UnitPreferencesProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <Routes>
                  <Route element={<InvitationLanding />} path="/invitation" />
                  <Route element={<ClientJourneyGate />}>
                    <Route element={<ClientWelcome />} path="/portal/welcome" />
                    <Route
                      element={<ClientOnboarding />}
                      path="/portal/onboarding"
                    />
                  </Route>
                </Routes>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </UnitPreferencesProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
  window.sessionStorage.clear();
});

describe('opening an invitation link', () => {
  it('checks the invitation before showing the account card', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited'));

    // act
    const checking = screen.getByRole('status');

    // assert
    expect(checking).toHaveTextContent('Checking your invitation…');
    expect(checking).toHaveAttribute('aria-busy', 'true');
    expect(
      await screen.findByRole('heading', { name: 'Create your account' }, WAIT),
    ).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('moves the token out of the address bar and keeps it for the tab', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited'));

    // act
    await screen.findByRole('link', { name: CONTINUE }, WAIT);

    // assert
    expect(window.location.hash).toBe('');
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(
      DEMO_TOKEN,
    );
  }, TEST_TIMEOUT_MS);
});

describe('accepting an invitation', () => {
  it('explains there is no code to type before handing her to the hosted sign-up', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited'));

    // act
    const heading = await screen.findByRole(
      'heading',
      { level: 1, name: 'Create your account' },
      WAIT,
    );

    // assert
    expect(heading).toBeVisible();
    expect(screen.getByText('Your invitation')).toBeVisible();
    expect(screen.getByText(HAND_OFF_NOTE)).toBeVisible();
    expect(screen.queryByText(/one-time code/i)).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('hands her to the hosted sign-in and lands her on the welcome page', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited'));
    const create = await screen.findByRole('link', { name: CONTINUE }, WAIT);

    // act
    await userEvent.click(create);

    // assert
    expect(create).toHaveAttribute(
      'href',
      'https://accounts.evoa.fit/sign-up?__clerk_ticket=mock',
    );
    expect(await screen.findByText('welcome page', undefined, WAIT)).toBeVisible();
    expect(screen.getByTestId('session')).toHaveTextContent('client');
    expect(screen.getByTestId('stage')).toHaveTextContent('account-created');
  }, TEST_TIMEOUT_MS);

  it('shows the invited email as a read-only field', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited'));

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
      renderInvitation(
        invitationAddress(`?jstage=invited&invitationstate=${linkState}`),
      );

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
      expect(
        screen.queryByRole('link', { name: CONTINUE }),
      ).not.toBeInTheDocument();
    },
    TEST_TIMEOUT_MS,
  );
});

describe('opening an invitation while signed in', () => {
  it.each(['coach', 'client'])(
    'asks a signed-in %s to sign out first without checking the invitation',
    (session) => {
      // arrange
      renderInvitation(invitationAddress(`?jstage=invited&session=${session}`));

      // act
      const heading = screen.getByRole('heading', {
        level: 1,
        name: SIGNED_IN_TITLE,
      });

      // assert
      expect(heading).toBeVisible();
      expect(screen.getByText('Invitation')).toBeVisible();
      expect(screen.getByText(SIGNED_IN_BODY)).toBeVisible();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: CONTINUE }),
      ).not.toBeInTheDocument();
    },
  );

  it('returns to the account card for the same link after signing out', async () => {
    // arrange
    renderInvitation(invitationAddress('?jstage=invited&session=coach'));

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    // assert
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
    expect(
      await screen.findByRole('link', { name: CONTINUE }, WAIT),
    ).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(
      screen.queryByRole('heading', { name: SIGNED_IN_TITLE }),
    ).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);
});

describe('the invitation lands her in the onboarding wizard', () => {
  it('reaches step 1 of the wizard after signing up and continuing past the welcome page', async () => {
    // arrange
    renderInvitationThroughPortal(invitationAddress('?jstage=invited'));
    const create = await screen.findByRole('link', { name: CONTINUE }, WAIT);

    // act
    await userEvent.click(create);
    const start = await screen.findByRole(
      'button',
      { name: "Let's get started" },
      WAIT,
    );
    await userEvent.click(start);

    // assert
    expect(await screen.findByText('Step 1 of 5', undefined, WAIT)).toBeVisible();
  }, TEST_TIMEOUT_MS);
});
