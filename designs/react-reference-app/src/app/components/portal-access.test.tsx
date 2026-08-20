import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PortalLayout } from './client-portal/PortalLayout';
import { CoachLayout } from './coach-portal/CoachLayout';
import { AppProvider, type PrototypeSession } from '../context/AppContext';

// The guards are the ticket's real subject: a signed-out visitor belongs in
// authentication, an authenticated one without access belongs on the 403.
function renderGuardedRoute(path: string, session: PrototypeSession) {
  window.history.replaceState({}, '', session === 'anonymous' ? '/' : `/?session=${session}`);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <Routes>
          <Route path="/portal" element={<PortalLayout />} />
          <Route path="/coach" element={<CoachLayout />} />
          <Route path="/403" element={<h1>Denied</h1>} />
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('portal access guards', () => {
  it.each([
    ['/portal', 'coach'],
    ['/portal', 'user'],
    ['/coach', 'client'],
    ['/coach', 'user'],
  ] as const)('sends a signed-in %s visitor without access to the 403', (path, session) => {
    // arrange
    // act
    renderGuardedRoute(path, session);

    // assert
    expect(screen.getByRole('heading', { name: 'Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
  });

  it.each(['/portal', '/coach'] as const)(
    'sends a signed-out visitor at %s home for authentication, not to the 403',
    (path) => {
      // arrange
      // act
      renderGuardedRoute(path, 'anonymous');

      // assert
      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Denied' })).not.toBeInTheDocument();
    },
  );
});
