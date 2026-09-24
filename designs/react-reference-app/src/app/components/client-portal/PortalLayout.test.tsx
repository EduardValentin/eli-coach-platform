import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { PortalLayout } from './PortalLayout';

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
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/portal']}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <NotificationProvider>
                  <Routes>
                    <Route path="/portal" element={<PortalLayout />}>
                      <Route index element={<h1>Dashboard</h1>} />
                    </Route>
                  </Routes>
                </NotificationProvider>
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('PortalLayout portal attribute', () => {
  it('sets data-portal="client" on the document element while mounted', () => {
    // arrange
    // act
    const { unmount } = renderLayout();

    // assert
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.portal).toBe('client');

    unmount();

    expect(document.documentElement.dataset.portal).toBeUndefined();
  });
});
