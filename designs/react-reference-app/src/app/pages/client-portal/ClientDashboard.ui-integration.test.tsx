import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { CycleProvider } from '../../context/CycleContext';
import { TrainingProvider } from '../../context/TrainingContext';
import { UnitPreferencesProvider } from '../../context/UnitPreferencesContext';
import { ClientDashboard } from './ClientDashboard';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
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

function renderDashboard(devParams: string) {
  const url = `/portal?session=client&jstage=program-ready${devParams}`;
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <TrainingProvider>
          <ClientProfileProvider>
            <UnitPreferencesProvider>
              <CycleProvider>
                <AssessmentCallProvider>
                  <ClientJourneyProvider>
                    <Routes>
                      <Route element={<ClientDashboard />} path="/portal" />
                      <Route
                        element={<p>profile page</p>}
                        path="/portal/profile"
                      />
                    </Routes>
                  </ClientJourneyProvider>
                </AssessmentCallProvider>
              </CycleProvider>
            </UnitPreferencesProvider>
          </ClientProfileProvider>
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('the measurements nudge on her dashboard', () => {
  it('stays away while nothing is due', () => {
    // arrange
    renderDashboard('');

    // act
    const nudges = [
      screen.queryByRole('link', { name: 'Your weekly weigh-in is due' }),
      screen.queryByRole('link', {
        name: 'Time for your measurements and photos',
      }),
    ];

    // assert
    expect(nudges).toEqual([null, null]);
  });

  it('asks for the weekly weigh-in and leads to her profile', async () => {
    // arrange
    renderDashboard('&jdue=weigh-in');

    // act
    await userEvent.click(
      screen.getByRole('link', { name: 'Your weekly weigh-in is due' }),
    );

    // assert
    expect(screen.getByText('profile page')).toBeVisible();
  });

  it('asks for measurements and photos when a full set is due', () => {
    // arrange
    renderDashboard('&jdue=measurements');

    // act
    const nudge = screen.getByRole('link', {
      name: 'Time for your measurements and photos',
    });

    // assert
    expect(nudge).toHaveAttribute('href', '/portal/profile');
    expect(
      screen.queryByRole('link', { name: 'Your weekly weigh-in is due' }),
    ).not.toBeInTheDocument();
  });
});
