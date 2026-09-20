import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ClientWelcome } from './ClientWelcome';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import {
  ClientJourneyProvider,
  useClientJourneys,
} from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

function WelcomeSeenProbe() {
  const { demoJourney } = useClientJourneys();

  return (
    <span data-testid="welcome-seen">
      {demoJourney.welcomeSeen ? 'seen' : 'unseen'}
    </span>
  );
}

function renderWelcome(devParams: string) {
  const url = `/portal/welcome${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <WelcomeSeenProbe />
              <Routes>
                <Route element={<ClientWelcome />} path="/portal/welcome" />
                <Route element={<p>onboarding page</p>} path="/portal/onboarding" />
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

describe('the welcome page', () => {
  it("greets her by name and sets out Eli's five-part form", () => {
    // arrange
    renderWelcome('?session=client&jstage=account-created');

    // act
    const heading = screen.getByRole('heading', { level: 1 });

    // assert
    expect(heading).toHaveTextContent('Welcome to Evoa Fitness, Jane');
    expect(screen.getByText("I'm really glad you're here.")).toBeVisible();
    expect(
      screen.getByText(
        'From now on, we work together — with a plan built around your goals and what your body actually needs.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'But first, I need to get to know you. Your next step is a short form in five parts — it takes about 15 minutes — covering your goals, your training experience, your health, your cycle, your nutrition and your measurements.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'You can pause and come back anytime — your answers are saved as you go. Try not to leave it too long: I can only start building your program once I have your answers.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Once you've completed it, I'll go through everything and build your program. You'll find it right here in your account.",
      ),
    ).toBeVisible();
  });

  it('offers one action that marks the welcome seen and opens the onboarding', async () => {
    // arrange
    renderWelcome('?session=client&jstage=account-created');

    // act
    await userEvent.click(screen.getByRole('button', { name: "Let's get started" }));

    // assert
    expect(screen.getByText('onboarding page')).toBeVisible();
    expect(screen.getByTestId('welcome-seen')).toHaveTextContent('seen');
  });

  it('counts four parts and drops the cycle for a male account', () => {
    // arrange
    renderWelcome('?session=client&jstage=account-created&jsex=male');

    // act
    const buttons = screen.getAllByRole('button');

    // assert
    expect(buttons).toHaveLength(1);
    expect(
      screen.getByText(
        'But first, I need to get to know you. Your next step is a short form in four parts — it takes about 15 minutes — covering your goals, your training experience, your health, your nutrition and your measurements.',
      ),
    ).toBeVisible();
  });
});
