import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider } from '../context/CheckinContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { StoreProvider } from '../context/StoreContext';
import { NotificationProvider } from '../context/NotificationContext';
import { DevToggle } from './DevToggle';
import { PrototypeSurface } from './PrototypeSurface';

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
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

function renderSurface() {
  window.history.replaceState(null, '', '/');

  return render(
    <MemoryRouter>
      <AppProvider>
        <StoreProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <NotificationProvider>
                <CheckinProvider>
                  <DevToggle />
                  <Routes>
                    <Route element={<PrototypeSurface />}>
                      <Route index element={<p>Landing page</p>} />
                    </Route>
                  </Routes>
                </CheckinProvider>
              </NotificationProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('coming-soon mode in the Dev Toggle', () => {
  it('swaps the app for the placeholder and back', async () => {
    // arrange
    const user = userEvent.setup();
    renderSurface();
    await user.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));

    // act
    await user.click(screen.getByRole('checkbox', { name: 'Coming-soon mode' }));

    // assert
    expect(screen.getByRole('main', { name: 'Coming soon' })).toBeInTheDocument();
    expect(screen.queryByText('Landing page')).toBeNull();

    // act
    await user.click(screen.getByRole('checkbox', { name: 'Coming-soon mode' }));

    // assert
    expect(screen.getByText('Landing page')).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Coming soon' })).toBeNull();
  });
});
