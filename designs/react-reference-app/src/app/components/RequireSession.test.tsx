import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RequireSession } from './RequireSession';
import { PortalLayout } from './client-portal/PortalLayout';
import { CoachLayout } from './coach-portal/CoachLayout';
import { ClientOnboarding } from '../pages/client-portal/ClientOnboarding';
import { WorkoutViewer } from '../pages/client-portal/WorkoutViewer';
import { AppProvider, type PrototypeSession } from '../context/AppContext';

// Denied requests never mount the guarded component, so the real route targets
// can be used here without their provider stacks.
function renderRoute(path: string, session: PrototypeSession) {
  window.history.replaceState({}, '', session === 'anonymous' ? '/' : `/?session=${session}`);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <Routes>
          <Route element={<RequireSession session="client" />}>
            <Route path="/portal" element={<PortalLayout />} />
            <Route path="/portal/onboarding" element={<ClientOnboarding />} />
            <Route path="/portal/workout/:planId/:weekIdx/:dayIdx" element={<WorkoutViewer />} />
          </Route>
          <Route element={<RequireSession session="coach" />}>
            <Route path="/coach" element={<CoachLayout />} />
          </Route>
          <Route path="/403" element={<h1>Denied</h1>} />
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

const GUARDED_CLIENT_PATHS = [
  '/portal',
  '/portal/onboarding',
  '/portal/workout/plan-1/0/0',
] as const;

describe('RequireSession', () => {
  it.each(GUARDED_CLIENT_PATHS)(
    'sends a signed-in coach at %s to the 403',
    (path) => {
      // arrange
      // act
      renderRoute(path, 'coach');

      // assert
      expect(screen.getByRole('heading', { name: 'Denied' })).toBeInTheDocument();
    },
  );

  it.each(GUARDED_CLIENT_PATHS)(
    'sends a signed-out visitor at %s home for authentication, not to the 403',
    (path) => {
      // arrange
      // act
      renderRoute(path, 'anonymous');

      // assert
      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Denied' })).not.toBeInTheDocument();
    },
  );

  it('sends a signed-in user without a portal to the 403', () => {
    // arrange
    // act
    renderRoute('/portal', 'user');

    // assert
    expect(screen.getByRole('heading', { name: 'Denied' })).toBeInTheDocument();
  });

  it('sends a client attempting coach access to the 403', () => {
    // arrange
    // act
    renderRoute('/coach', 'client');

    // assert
    expect(screen.getByRole('heading', { name: 'Denied' })).toBeInTheDocument();
  });

  it('sends a signed-out visitor at /coach home rather than to the 403', () => {
    // arrange
    // act
    renderRoute('/coach', 'anonymous');

    // assert
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
