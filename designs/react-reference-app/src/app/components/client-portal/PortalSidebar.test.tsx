import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { CLIENT_PORTAL_LINKS, type ClientPortalLink } from './navigation-links';
import { PORTAL_MAIN_ID, PortalSidebar } from './PortalSidebar';

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

type RenderSidebarOptions = {
  links?: readonly ClientPortalLink[];
  search?: string;
};

function renderSidebar(options: RenderSidebarOptions = {}) {
  const { links = CLIENT_PORTAL_LINKS, search = '' } = options;
  window.history.replaceState(null, '', `/${search}`);

  render(
    <MemoryRouter>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <NotificationProvider>
                  <PortalSidebar links={links} />
                  <main id={PORTAL_MAIN_ID} tabIndex={-1}>
                    Dashboard content
                  </main>
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
    const postMvpLinks = [
      'My Plan',
      'Messages',
      'History',
      'Nutrition',
    ].flatMap((name) => screen.queryAllByRole('link', { name }));

    // assert
    expect(postMvpLinks).toHaveLength(0);
  });

  it('shows Post-MVP features in Post-MVP mode', () => {
    // arrange
    renderSidebar({ search: '?scope=post-mvp' });

    // act
    const postMvpLinks = [
      'My Plan',
      'Messages',
      'History',
      'Nutrition',
    ].flatMap((name) => screen.queryAllByRole('link', { name }));

    // assert
    expect(postMvpLinks).not.toHaveLength(0);
  });
});

describe('PortalSidebar mobile tabs', () => {
  it('puts Dashboard, Check-ins and Profile on the bar and Cycle under More in MVP', () => {
    // arrange
    renderSidebar();

    // act
    const bar = screen.getByRole('navigation', { name: 'Client portal tabs' });
    const tabNames = within(bar)
      .getAllByRole('link')
      .map((link) => link.textContent);

    // assert
    expect(tabNames).toEqual(['Dashboard', 'Check-ins', 'Profile']);
    expect(within(bar).getByRole('button', { name: 'More' })).toBeVisible();
    expect(within(bar).queryByRole('link', { name: 'Cycle' })).toBeNull();
  });

  it('caps the bar at four tabs in Post-MVP and moves Profile under More', () => {
    // arrange
    renderSidebar({ search: '?scope=post-mvp' });

    // act
    const bar = screen.getByRole('navigation', { name: 'Client portal tabs' });
    const tabNames = within(bar)
      .getAllByRole('link')
      .map((link) => link.textContent);

    // assert
    expect(tabNames).toEqual(['Dashboard', 'My Plan', 'Messages', 'Check-ins']);
    expect(within(bar).queryByRole('link', { name: 'Profile' })).toBeNull();
  });
});

describe('PortalSidebar landmarks', () => {
  it('names the sidebar, its navigation, the top bar and the tab bar', () => {
    // arrange
    renderSidebar();

    // act
    const sidebar = screen.getByRole('complementary', {
      name: 'Client portal sidebar',
    });

    // assert
    expect(
      within(sidebar).getByRole('navigation', {
        name: 'Client portal navigation',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('banner', { name: 'Client portal top bar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Client portal tabs' }),
    ).toBeInTheDocument();
  });
});

describe('PortalSidebar More sheet', () => {
  it('opens a sheet titled More holding the remaining links and Sign out', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();

    // act
    await user.click(screen.getByRole('button', { name: 'More' }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'More' });
    const sheetNavigation = within(sheet).getByRole('navigation', {
      name: 'Client portal more',
    });
    expect(
      within(sheetNavigation).getByRole('link', { name: 'Cycle' }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('points More at the open sheet it controls', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();
    const more = screen.getByRole('button', { name: 'More' });

    // act
    await user.click(more);

    // assert
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(more.getAttribute('aria-controls')).toBe(sheet.id);
  });

  it('closes on Escape and returns focus to More', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();
    const more = screen.getByRole('button', { name: 'More' });
    await user.click(more);

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), {
      timeout: 3000,
    });
    await waitFor(() => expect(more).toHaveFocus());
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });

  it('holds no navigation when every link sits on the tab bar', async () => {
    // arrange
    const user = userEvent.setup();
    const tabLinks = CLIENT_PORTAL_LINKS.filter((link) =>
      ['Dashboard', 'Check-ins', 'Profile'].includes(link.name),
    );
    renderSidebar({ links: tabLinks });

    // act
    await user.click(screen.getByRole('button', { name: 'More' }));

    // assert
    const sheet = screen.getByRole('dialog', { name: 'More' });
    expect(within(sheet).queryByRole('navigation')).toBeNull();
    expect(
      within(sheet).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it('closes and focuses the main content once the tab bar is hidden', async () => {
    // arrange
    const user = userEvent.setup();
    renderSidebar();
    const tabBar = screen.getByRole('navigation', {
      name: 'Client portal tabs',
    });
    await user.click(within(tabBar).getByRole('button', { name: 'More' }));

    // act
    tabBar.style.display = 'none';
    fireEvent(window, new Event('resize'));

    // assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), {
      timeout: 3000,
    });
    await waitFor(() =>
      expect(document.getElementById(PORTAL_MAIN_ID)).toHaveFocus(),
    );
  });
});
