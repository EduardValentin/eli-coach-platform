import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ClientOnboarding } from './ClientOnboarding';
import { AppProvider, type PrototypeSession } from '../../context/AppContext';
import { CycleProvider } from '../../context/CycleContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NutritionProvider } from '../../context/NutritionContext';

function renderOnboarding(session: PrototypeSession) {
  window.history.replaceState({}, '', session === 'anonymous' ? '/' : `/?session=${session}`);

  render(
    <MemoryRouter initialEntries={['/portal/onboarding']}>
      <AppProvider>
        <ClientProfileProvider>
          <NutritionProvider>
            <CycleProvider>
              <Routes>
                <Route path="/portal/onboarding" element={<ClientOnboarding />} />
                <Route path="/403" element={<h1>Denied</h1>} />
                <Route path="/" element={<h1>Home</h1>} />
              </Routes>
            </CycleProvider>
          </NutritionProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('ClientOnboarding access', () => {
  it.each(['coach', 'user'] as const)(
    'sends a signed-in %s without client access to the 403 rather than rendering nothing',
    (session) => {
      // arrange
      // act
      renderOnboarding(session);

      // assert
      expect(screen.getByRole('heading', { name: 'Denied' })).toBeInTheDocument();
    },
  );

  it('sends a signed-out visitor home for authentication', () => {
    // arrange
    // act
    renderOnboarding('anonymous');

    // assert
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Denied' })).not.toBeInTheDocument();
  });
});
