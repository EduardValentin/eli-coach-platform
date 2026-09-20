import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ClientJourneyGate } from './ClientJourneyGate';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';

function renderGate(path: string) {
  window.history.replaceState({}, '', path);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <Routes>
                <Route element={<ClientJourneyGate />}>
                  <Route element={<p>portal home</p>} path="/portal" />
                  <Route element={<p>welcome page</p>} path="/portal/welcome" />
                  <Route element={<p>onboarding page</p>} path="/portal/onboarding" />
                  <Route element={<p>plan page</p>} path="/portal/plan" />
                </Route>
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

describe('the client journey gate', () => {
  it('sends a client who has not seen the welcome to it', () => {
    // arrange
    const path = '/portal/plan?session=client&jstage=account-created';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('welcome page')).toBeVisible();
  });

  it('treats a journey still at the invitation like a fresh account', () => {
    // arrange
    const path = '/portal/plan?session=client&jstage=invited';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('welcome page')).toBeVisible();
  });

  it('sends a client who has seen the welcome to the onboarding', () => {
    // arrange
    const path = '/portal/plan?session=client&jstage=onboarding';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('onboarding page')).toBeVisible();
  });

  it('closes the welcome once her answers are submitted', () => {
    // arrange
    const path = '/portal/welcome?session=client&jstage=submitted';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('portal home')).toBeVisible();
  });

  it('closes the onboarding once her answers are submitted', () => {
    // arrange
    const path = '/portal/onboarding?session=client&jstage=submitted';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('portal home')).toBeVisible();
  });

  it('reopens the onboarding for an answer request', () => {
    // arrange
    const path = '/portal/onboarding?answer=1&session=client&jstage=needs-details';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('onboarding page')).toBeVisible();
  });

  it('leaves the rest of the portal alone once she has submitted', () => {
    // arrange
    const path = '/portal/plan?session=client&jstage=reviewing';

    // act
    renderGate(path);

    // assert
    expect(screen.getByText('plan page')).toBeVisible();
  });
});
