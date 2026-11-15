import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { CoachProfileProvider } from '../../context/CoachProfileContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { CoachLayout } from './CoachLayout';

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
    <MemoryRouter initialEntries={['/coach']}>
      <AppProvider>
        <CoachProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <NotificationProvider>
                  <CheckinProvider>
                    <Routes>
                      <Route path="/coach" element={<CoachLayout />}>
                        <Route index element={<h1>Dashboard</h1>} />
                      </Route>
                    </Routes>
                  </CheckinProvider>
                </NotificationProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
        </CoachProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('CoachLayout portal attribute', () => {
  it('sets data-portal="coach" on the document element while mounted', () => {
    // arrange
    // act
    const { unmount } = renderLayout();

    // assert
    expect(
      screen.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.portal).toBe('coach');

    unmount();

    expect(document.documentElement.dataset.portal).toBeUndefined();
  });
});

describe('CoachLayout skip link', () => {
  it('opens with a skip link to the focusable main content', async () => {
    // arrange
    const user = userEvent.setup();
    renderLayout();

    // act
    await user.tab();

    // assert
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    const main = screen.getByRole('main');
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', `#${main.id}`);
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});
