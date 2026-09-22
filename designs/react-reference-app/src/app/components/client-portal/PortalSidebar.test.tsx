import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { PortalSidebar } from './PortalSidebar';

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
  window.history.replaceState(null, '', '/');
});

function renderSidebar(search = '') {
  window.history.replaceState(null, '', `/${search}`);

  render(
    <MemoryRouter>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <NotificationProvider>
                  <PortalSidebar />
                </NotificationProvider>
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('PortalSidebar prototype mode', () => {
  it('hides Post-MVP features in MVP mode', () => {
    // arrange
    renderSidebar();

    // act
    const postMvpLinks = ['My Plan', 'Messages', 'History', 'Nutrition'].flatMap((name) =>
      screen.queryAllByRole('link', { name }),
    );

    // assert
    expect(postMvpLinks).toHaveLength(0);
  });

  it('shows Post-MVP features in Post-MVP mode', () => {
    // arrange
    renderSidebar('?scope=post-mvp');

    // act
    const postMvpLinks = ['My Plan', 'Messages', 'History', 'Nutrition'].flatMap((name) =>
      screen.queryAllByRole('link', { name }),
    );

    // assert
    expect(postMvpLinks).not.toHaveLength(0);
  });
});
