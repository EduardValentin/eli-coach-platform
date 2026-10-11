import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevToggle } from '../../components/DevToggle';
import { Toaster } from '../../components/ui/sonner';
import { AppProvider } from '../../context/AppContext';
import { AssessmentCallProvider } from '../../context/AssessmentCallContext';
import { CheckinProvider } from '../../context/CheckinContext';
import { ClientJourneyProvider } from '../../context/ClientJourneyContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { CoachProfileProvider } from '../../context/CoachProfileContext';
import { MessagingProvider } from '../../context/MessagingContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { PROTOTYPE_MEETING_LINK } from '../../services/assessmentCallService';
import { CheckinJoin } from '../CheckinJoin';
import { CoachCheckins } from './CoachCheckins';

const SERVICE_TIMEOUT = { timeout: 4000 };

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width'),
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
  toast.dismiss();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

function renderAt(path: string) {
  window.history.replaceState({}, '', path);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <CoachProfileProvider>
          <ClientProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <CheckinProvider>
                  <MessagingProvider>
                    <NotificationProvider>
                      <Routes>
                        <Route path="/coach/checkins" element={<CoachCheckins />} />
                        <Route
                          path="/coach/checkins/:checkinId/join"
                          element={<CheckinJoin party="coach" />}
                        />
                      </Routes>
                      <Toaster />
                      <DevToggle />
                    </NotificationProvider>
                  </MessagingProvider>
                </CheckinProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
          </ClientProfileProvider>
        </CoachProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderPage(devParams = '') {
  renderAt(`/coach/checkins?session=coach${devParams}`);
}

function listedCheckins(): HTMLElement {
  return screen.getByRole('list', { name: /check-ins$/ });
}

function rowFor(clientName: string): HTMLElement {
  const row = within(listedCheckins())
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(clientName) !== null);
  if (!row) throw new Error(`No check-in row for ${clientName}`);

  return row;
}

function hasRowFor(clientName: string): boolean {
  return within(listedCheckins()).queryAllByText(clientName).length > 0;
}

async function showTab(name: string) {
  await userEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));
}

describe('the coach check-ins page', () => {
  it('opens on the requests and counts the ones waiting for her answer', () => {
    // arrange
    // act
    renderPage();

    // assert
    const requestsTab = screen.getByRole('tab', { name: /^Requests/ });

    expect(requestsTab).toHaveAttribute('aria-selected', 'true');
    expect(requestsTab).toHaveAccessibleName('Requests 2 waiting on you');
    expect(within(rowFor('Jessica Alba')).getByText(/I have some questions about my macros/)).toBeInTheDocument();
  });

  it('approves a request and moves it to upcoming', async () => {
    // arrange
    renderPage();
    const row = rowFor('Jessica Alba');

    // act
    await userEvent.click(within(row).getByRole('button', { name: 'Approve' }));

    // assert
    expect(within(row).getByRole('button', { name: 'Approving…' })).toBeDisabled();
    expect(within(row).getByRole('button', { name: 'Decline' })).toBeDisabled();
    expect(
      await screen.findByText('Approved check-in with Jessica Alba', {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests 1 waiting on you');
    // act
    await showTab('Upcoming');
    // assert
    expect(hasRowFor('Jessica Alba')).toBe(true);
  });

  it('declines a request and files it under past as cancelled', async () => {
    // arrange
    renderPage();
    const row = rowFor('Emma Stone');

    // act
    await userEvent.click(within(row).getByRole('button', { name: 'Decline' }));

    // assert
    expect(await screen.findByText('Check-in declined', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.queryByText(/Knee feels off after lunges/)).not.toBeInTheDocument();
    // act
    await showTab('Past');
    // assert
    expect(within(rowFor('Emma Stone')).getByText('Cancelled')).toBeInTheDocument();
  });

  it('keeps the request waiting when approving fails', async () => {
    // arrange
    renderPage('&ckservice=fails');
    const row = rowFor('Jessica Alba');

    // act
    await userEvent.click(within(row).getByRole('button', { name: 'Approve' }));

    // assert
    expect(
      await screen.findByText("The check-in wasn't approved. Try again.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests 2 waiting on you');
  });

  it('explains the empty requests tab', async () => {
    // arrange
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Check-ins' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Pending check-ins' }));

    // act
    await userEvent.click(await screen.findByRole('option', { name: 'None pending' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close Dev Settings' }));

    // assert
    expect(screen.getByText('No open requests')).toBeInTheDocument();
    expect(
      screen.getByText('Requests from your clients and the ones you send show up here.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests');
  });

  it('offers Join Meet on each upcoming check-in, linked to its join page', async () => {
    // arrange
    renderPage();

    // act
    await showTab('Upcoming');

    // assert
    const links = within(listedCheckins()).getAllByRole('link', { name: 'Join Meet' });
    expect(links.length).toBe(within(listedCheckins()).getAllByRole('listitem').length);
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/coach\/checkins\/[\w-]+\/join$/));
  });
});

const MORE_ACTIONS = /^More actions for the check-in/;
const ROW_ACTION = /^(Reschedule|Cancel|Cancel request|Decline|Accept|Approve)$/;

function rowWith(text: RegExp): HTMLElement {
  const row = within(listedCheckins())
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(text) !== null);
  if (!row) throw new Error(`No check-in row shows ${text}`);

  return row;
}

function moreActionsIn(row: HTMLElement): HTMLElement {
  return within(row).getByRole('button', { name: MORE_ACTIONS });
}

function shownRowActions(row: HTMLElement): (string | null)[] {
  return within(row)
    .queryAllByRole('button', { name: ROW_ACTION })
    .map((button) => button.textContent);
}

async function menuItemsBehind(trigger: HTMLElement): Promise<string[]> {
  await userEvent.click(trigger);
  const menu = await screen.findByRole('menu');
  const names = within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
  await userEvent.keyboard('{Escape}');

  return names;
}

describe('the actions on the coach’s check-in rows', () => {
  it('keeps Join Meet on an upcoming check-in and puts Reschedule then Cancel in its menu', async () => {
    // arrange
    renderPage();
    await showTab('Upcoming');
    const row = rowFor('Jessica Alba');

    // act
    const items = await menuItemsBehind(moreActionsIn(row));

    // assert
    expect(within(row).getByRole('link', { name: 'Join Meet' })).toBeInTheDocument();
    expect(shownRowActions(row)).toEqual([]);
    expect(moreActionsIn(row)).toHaveAccessibleName(
      /^More actions for the check-in on \w{3}, \w{3} \d{1,2} at \d{1,2}:\d{2}\s?[AP]M$/,
    );
    expect(items).toEqual(['Reschedule', 'Cancel']);
  });

  it('shows Decline and Approve side by side on a client’s request with Reschedule in the menu', async () => {
    // arrange
    renderPage();
    const row = rowFor('Jessica Alba');

    // act
    const items = await menuItemsBehind(moreActionsIn(row));

    // assert
    expect(shownRowActions(row)).toEqual(['Decline', 'Approve']);
    expect(items).toEqual(['Reschedule']);
  });

  it('keeps Cancel request on her own request with no menu', () => {
    // arrange
    // act
    renderPage();

    // assert
    const row = rowWith(/Quick look at your first two weeks/);
    expect(shownRowActions(row)).toEqual(['Cancel request']);
    expect(within(row).queryByRole('button', { name: MORE_ACTIONS })).not.toBeInTheDocument();
  });

  it('shows no actions on past check-ins', async () => {
    // arrange
    renderPage();

    // act
    await showTab('Past');

    // assert
    expect(within(listedCheckins()).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(shownRowActions(listedCheckins())).toEqual([]);
    expect(within(listedCheckins()).queryByRole('button', { name: MORE_ACTIONS })).not.toBeInTheDocument();
    expect(within(listedCheckins()).queryByRole('link', { name: 'Join Meet' })).not.toBeInTheDocument();
  });

  it('leaves the menu out of a program review she can neither move nor cancel', async () => {
    // arrange
    renderPage('&scope=post-mvp&jstage=review-call-scheduled');

    // act
    await showTab('Upcoming');

    // assert
    const row = rowWith(/Program review/);
    expect(within(row).getByRole('link', { name: 'Join Meet' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: MORE_ACTIONS })).not.toBeInTheDocument();
  });

  it('opens the menu on Enter, moves with the arrow keys and gives focus back to its button on Escape', async () => {
    // arrange
    renderPage();
    await showTab('Upcoming');
    const trigger = moreActionsIn(rowFor('Jessica Alba'));
    act(() => trigger.focus());

    // act
    await userEvent.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}');

    // assert
    expect(within(menu).getByRole('menuitem', { name: 'Cancel' })).toHaveFocus();
    // act
    await userEvent.keyboard('{Escape}');
    // assert
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('asks before cancelling from the menu and gives focus back to its button when she keeps the check-in', async () => {
    // arrange
    renderPage();
    await showTab('Upcoming');
    const trigger = moreActionsIn(rowFor('Jessica Alba'));
    act(() => trigger.focus());
    await userEvent.keyboard(' ');
    await screen.findByRole('menu');
    await userEvent.keyboard('{ArrowDown}');

    // act
    await userEvent.keyboard('{Enter}');
    const confirm = await screen.findByRole('dialog', { name: 'Cancel this check-in?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Keep' }));

    // assert
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(hasRowFor('Jessica Alba')).toBe(true);
  });

  it('cancels the check-in once she confirms from the menu', async () => {
    // arrange
    renderPage();
    await showTab('Upcoming');
    await userEvent.click(moreActionsIn(rowFor('Jessica Alba')));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancel' }));
    const confirm = await screen.findByRole('dialog', { name: 'Cancel this check-in?' });

    // act
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel check-in' }));

    // assert
    expect(await screen.findByText('Cancelled check-in with Jessica Alba')).toBeInTheDocument();
    expect(hasRowFor('Jessica Alba')).toBe(false);
  });
});

const OWN_REQUEST_NOTE = /Quick look at your first two weeks/;

describe('the coach’s own requests', () => {
  it('lists them after the requests waiting for her answer, marked as hers', () => {
    // arrange
    // act
    renderPage();

    // assert
    const rows = within(listedCheckins()).getAllByRole('listitem');
    const awaitingHer = rows.filter((row) => within(row).queryByRole('button', { name: 'Approve' }));
    const hers = rows.filter((row) => within(row).queryByText(/Requested by you$/));
    expect(awaitingHer.length).toBeGreaterThan(0);
    expect(hers.length).toBeGreaterThan(0);
    expect(rows.indexOf(awaitingHer.at(-1)!)).toBeLessThan(rows.indexOf(hers[0]));
    expect(within(rowWith(OWN_REQUEST_NOTE)).getByText(/Requested by you$/)).toBeInTheDocument();
  });

  it('cancels her waiting request and files it under past as cancelled', async () => {
    // arrange
    renderPage();
    const row = rowWith(OWN_REQUEST_NOTE);

    // act
    await userEvent.click(within(row).getByRole('button', { name: 'Cancel request' }));

    // assert
    expect(within(row).getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
    expect(await screen.findByText('Request cancelled', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.queryByText(OWN_REQUEST_NOTE)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests 2 waiting on you');
    // act
    await showTab('Past');
    // assert
    expect(within(rowWith(OWN_REQUEST_NOTE)).getByText('Cancelled')).toBeInTheDocument();
  });

  it('keeps her request waiting when cancelling it fails', async () => {
    // arrange
    renderPage('&ckservice=fails');
    const row = rowWith(OWN_REQUEST_NOTE);

    // act
    await userEvent.click(within(row).getByRole('button', { name: 'Cancel request' }));

    // assert
    expect(
      await screen.findByText("Your request wasn't cancelled. Try again.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Cancel request' })).toBeEnabled();
  });
});

describe('the coach joining a check-in', () => {
  it('sends her to her meeting room for an approved check-in', async () => {
    // arrange
    const path = '/coach/checkins/ck-3/join?session=coach&meetlink=set';
    const assign = vi.fn();
    window.history.replaceState({}, '', path);
    vi.stubGlobal('location', { ...window.location, assign });

    // act
    renderAt(path);

    // assert
    await waitFor(() => expect(assign).toHaveBeenCalledWith(PROTOTYPE_MEETING_LINK));
  });

  it('points her to Settings while no meeting link is saved', () => {
    // arrange
    // act
    renderAt('/coach/checkins/ck-3/join?session=coach');

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: "Your meeting link isn't set yet" }),
    ).toBeInTheDocument();
    const forward = screen.getByRole('link', { name: /Go to Settings/ });
    expect(forward).toHaveAttribute('href', '/coach/settings');
    expect(forward.lastElementChild).toHaveClass('lucide-arrow-right');
  });

  it.each([
    ['an unknown check-in', 'nope'],
    ['a request still waiting for an answer', 'ck-4'],
    ['a cancelled check-in', 'ck-8'],
  ])('answers not found for %s', (_case, checkinId) => {
    // arrange
    // act
    renderAt(`/coach/checkins/${checkinId}/join?session=coach&meetlink=set`);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
