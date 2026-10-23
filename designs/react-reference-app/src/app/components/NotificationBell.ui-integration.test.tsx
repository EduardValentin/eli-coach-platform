import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevToggle } from './DevToggle';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './ui/sonner';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider } from '../context/CheckinContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { CoachProfileProvider } from '../context/CoachProfileContext';
import { MessagingProvider } from '../context/MessagingContext';
import { NotificationProvider } from '../context/NotificationContext';
import { ClientCheckins } from '../pages/client-portal/ClientCheckins';
import { CoachCheckins } from '../pages/coach-portal/CoachCheckins';
import { coachCheckinPath } from '../utils/checkinLinks';

const SERVICE_TIMEOUT = { timeout: 4000 };
const DESKTOP_WIDTH = 1024;
const PHONE_WIDTH = 390;
const OLDEST_PAST_CHECKIN = 'ck-many-c1-past-11';

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
  window.innerWidth = DESKTOP_WIDTH;
  window.history.replaceState({}, '', '/');
});

function renderAt(path: string) {
  window.history.replaceState({}, '', path);

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <CoachProfileProvider>
            <AssessmentCallProvider>
              <ClientJourneyProvider>
                <NotificationProvider>
                  <CheckinProvider>
                    <MessagingProvider>
                      <NotificationBell />
                      <Link to={coachCheckinPath(OLDEST_PAST_CHECKIN)}>Open the oldest check-in</Link>
                      <Routes>
                        <Route path="/coach" element={<p>Dashboard</p>} />
                        <Route path="/coach/checkins" element={<CoachCheckins />} />
                        <Route path="/portal/checkins" element={<ClientCheckins />} />
                      </Routes>
                      <Toaster />
                      <DevToggle />
                    </MessagingProvider>
                  </CheckinProvider>
                </NotificationProvider>
              </ClientJourneyProvider>
            </AssessmentCallProvider>
        </CoachProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function bellTrigger(): HTMLElement {
  return screen.getByRole('button', { name: /^Notifications/ });
}

async function openBell(): Promise<HTMLElement> {
  await userEvent.click(bellTrigger());

  return screen.findByRole('dialog', { name: 'Notifications' });
}

function rowTitled(bell: HTMLElement, title: string): HTMLElement {
  const row = within(bell)
    .getAllByRole('link')
    .find((link) => within(link).queryByText(title) !== null);
  if (!row) throw new Error(`No notification titled ${title}`);

  return row;
}

async function openDevTab(tab: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
  await userEvent.click(screen.getByRole('tab', { name: tab }));
}

async function chooseDevOption(field: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: field }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

async function closeDevToggle() {
  await userEvent.click(screen.getByRole('button', { name: 'Close Dev Settings' }));
}

describe('the coach’s bell', () => {
  it('names how many check-in events wait unread and lists them newest first', async () => {
    // arrange
    renderAt('/coach?session=coach');

    // act
    const bell = await openBell();

    // assert
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 3 unread');
    const rows = within(bell).getAllByRole('link');
    expect(within(rows[0]).getByText('Check-in requested')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/^Jessica Alba asked for a check-in on /)).toBeInTheDocument();
    expect(within(rows[0]).getByText('1 h ago')).toBeInTheDocument();
    expect(within(rowTitled(bell, 'Check-in request expired')).getByText(/^Jane Doe's check-in on .* was not answered in time\.$/)).toBeInTheDocument();
  });

  it('marks everything read and drops the unread marker', async () => {
    // arrange
    renderAt('/coach?session=coach');
    const bell = await openBell();

    // act
    await userEvent.click(within(bell).getByRole('button', { name: 'Mark all read' }));

    // assert
    expect(bellTrigger()).toHaveAccessibleName('Notifications');
    expect(within(bell).queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument();
    expect(within(bell).queryByText(/^Unread/)).not.toBeInTheDocument();
  });

  it('says so when nothing arrived yet', async () => {
    // arrange
    renderAt('/coach?session=coach');
    await openDevTab('Check-ins');
    await chooseDevOption('Bell', 'Empty');
    await closeDevToggle();

    // act
    const bell = await openBell();

    // assert
    expect(bellTrigger()).toHaveAccessibleName('Notifications');
    expect(within(bell).getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('lists only the latest thirty of many', async () => {
    // arrange
    renderAt('/coach?session=coach');
    await openDevTab('Check-ins');
    await chooseDevOption('Bell', 'Many (40, shows 30)');
    await closeDevToggle();

    // act
    const bell = await openBell();

    // assert
    expect(within(bell).getAllByRole('link')).toHaveLength(30);
  });

  it('opens a notification on the tab holding its check-in, also from the check-ins page, and marks it read', async () => {
    // arrange
    renderAt('/coach/checkins?session=coach');
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true');
    const bell = await openBell();

    // act
    await userEvent.click(rowTitled(bell, 'Check-in request expired'));

    // assert
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.getElementById('checkin-ck-12')).toHaveFocus());
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 2 unread');
  });

  it('opens a check-in link on the page of its tab holding it, also from the check-ins page', async () => {
    // arrange
    renderAt('/coach?session=coach');
    await openDevTab('Check-ins');
    await chooseDevOption('Pending check-ins', 'Many check-ins');
    await closeDevToggle();

    // act
    await userEvent.click(screen.getByRole('link', { name: 'Open the oldest check-in' }));

    // assert
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Go to page 1' })).not.toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(document.getElementById(`checkin-${OLDEST_PAST_CHECKIN}`)).toHaveFocus());
    // act
    await userEvent.click(screen.getByRole('link', { name: 'Go to page 1' }));
    // assert
    expect(document.getElementById(`checkin-${OLDEST_PAST_CHECKIN}`)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    // act
    await userEvent.click(screen.getByRole('link', { name: 'Open the oldest check-in' }));
    // assert
    await waitFor(() => expect(document.getElementById(`checkin-${OLDEST_PAST_CHECKIN}`)).toHaveFocus());
  });

  it('gets one entry when a renewal adds clashing weeks', async () => {
    // arrange
    renderAt('/coach?session=coach');
    await openDevTab('Check-ins');
    await chooseDevOption('Weekly series', 'Active');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Renewal adds clashing weeks' }));

    // assert
    await closeDevToggle();
    const bell = await openBell();
    expect(within(rowTitled(bell, '2 weekly check-ins clash')).getByText("Jane Doe's new weeks fall on a taken hour.")).toBeInTheDocument();
  });

  it('shows a toast with View when a notification arrives, and View opens it', async () => {
    // arrange
    renderAt('/coach?session=coach');
    await openDevTab('Check-ins');

    // act
    await userEvent.click(screen.getByRole('button', { name: 'Deliver a notification' }));

    // assert
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 4 unread');
    const toastItem = (await screen.findByText(/^Jessica Alba asked for a check-in on /, { selector: '[data-description]' })).closest('li');
    expect(toastItem).not.toBeNull();
    await closeDevToggle();
    // act
    await userEvent.click(within(toastItem as HTMLElement).getByRole('button', { name: 'View' }));
    // assert
    expect(await screen.findByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.getElementById('checkin-ck-4')).toHaveFocus());
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 3 unread');
  });

  it('opens as a sheet on a phone', async () => {
    // arrange
    window.innerWidth = PHONE_WIDTH;
    renderAt('/coach?session=coach');

    // act
    const sheet = await openBell();

    // assert
    expect(within(sheet).getByRole('button', { name: 'Mark all read' })).toBeInTheDocument();
    expect(within(rowTitled(sheet, 'Check-in request expired')).getByText(/was not answered in time\.$/)).toBeInTheDocument();
  });
});

describe('the client’s bell', () => {
  it('opens a notification on the tab holding her check-in from her check-ins page', async () => {
    // arrange
    renderAt('/portal/checkins?session=client');
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true');
    const bell = await openBell();

    // act
    await userEvent.click(rowTitled(bell, 'New time accepted'));

    // assert
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(document.getElementById('checkin-ck-16')).toHaveFocus());
    // act
    await userEvent.click(screen.getByRole('tab', { name: /^Requests/ }));
    // assert
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('carries her answer to the coach’s bell, not her own', async () => {
    // arrange
    renderAt('/portal/checkins?session=client');
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 3 unread');
    const requests = screen.getByRole('list', { name: 'Requests check-ins' });
    const proposal = within(requests)
      .getAllByRole('listitem')
      .find((item) => within(item).queryByRole('button', { name: 'Accept' }) !== null);
    if (!proposal) throw new Error('No new time waits for her');

    // act
    await userEvent.click(within(proposal).getByRole('button', { name: 'Accept' }));

    // assert
    await waitFor(() => expect(screen.getByText('Check-in approved')).toBeInTheDocument(), SERVICE_TIMEOUT);
    expect(bellTrigger()).toHaveAccessibleName('Notifications, 3 unread');
    // act
    await openDevTab('Session');
    await chooseDevOption('Session', 'Coach');
    await closeDevToggle();
    // assert
    const coachBell = await openBell();
    expect(
      within(rowTitled(coachBell, 'New time accepted')).getByText(/^Jane Doe accepted the check-in on /),
    ).toBeInTheDocument();
  });
});
