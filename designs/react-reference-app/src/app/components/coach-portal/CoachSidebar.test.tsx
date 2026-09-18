import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../../context/AppContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { CoachProfileProvider } from '../../context/CoachProfileContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { CoachSidebar } from './CoachSidebar';

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
});

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/coach']}>
      <AppProvider>
        <CoachProfileProvider>
          <CheckinProvider>
            <NotificationProvider>
              <CoachSidebar />
            </NotificationProvider>
          </CheckinProvider>
        </CoachProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('CoachSidebar mobile navigation', () => {
  it('opens as a named modal dialog with the top-bar actions inside', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();

    // act
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // assert
    const dialog = screen.getByRole('dialog', {
      name: 'Coach portal mobile navigation',
    });
    expect(within(dialog).getAllByRole('button', { name: /notifications/i })).toHaveLength(1);
    expect(within(dialog).getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
  });

  it('closes when the viewport crosses the desktop breakpoint', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();
    const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuTrigger);

    // act
    menuTrigger.style.display = 'none';
    window.dispatchEvent(new Event('resize'));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Coach portal mobile navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('moves focus into the navigation and restores it on Escape', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    // act
    await user.click(trigger);
    const mobileDashboard = within(
      screen.getByRole('dialog', {
        name: 'Coach portal mobile navigation',
      }),
    ).getByRole('link', { name: 'Dashboard' });
    const focusedAfterOpen = document.activeElement;
    await user.keyboard('{Escape}');

    // assert
    expect(focusedAfterOpen).toBe(mobileDashboard);
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Coach portal mobile navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });
});
