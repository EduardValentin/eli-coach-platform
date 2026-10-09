import { render, screen, waitFor, within } from '@testing-library/react';
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
    expect(requestsTab).toHaveAccessibleName('Requests 2');
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
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests 1');
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
    expect(screen.getByRole('tab', { name: /^Requests/ })).toHaveAccessibleName('Requests 2');
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
    expect(screen.getByRole('link', { name: /Go to Settings/ })).toHaveAttribute(
      'href',
      '/coach/settings',
    );
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
