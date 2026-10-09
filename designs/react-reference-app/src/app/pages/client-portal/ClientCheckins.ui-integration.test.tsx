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
import { ClientCheckins } from './ClientCheckins';

const SERVICE_TIMEOUT = { timeout: 4000 };
const WAITING_EXPLANATION = 'You can send another request once this one is answered.';
const NOTE = 'Can we look at my deadlift setup?';
const TIME_LABEL = /^\d{1,2}:\d{2}\s?[AP]M$/;

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
                        <Route path="/portal/checkins" element={<ClientCheckins />} />
                        <Route
                          path="/portal/checkins/:checkinId/join"
                          element={<CheckinJoin party="client" />}
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
  renderAt(`/portal/checkins?session=client${devParams}`);
}

function requestButtons(): HTMLElement[] {
  return [
    screen.getByRole('button', { name: 'Request check-in' }),
    screen.getByRole('button', { name: 'Request a check-in' }),
  ];
}

async function openRequestDialog() {
  await userEvent.click(screen.getByRole('button', { name: 'Request check-in' }));

  return screen.findByRole('dialog', { name: 'Request a check-in' });
}

function openDays(dialog: HTMLElement): HTMLButtonElement[] {
  return [...dialog.querySelectorAll<HTMLButtonElement>('td[data-day] button')].filter(
    (day) => !day.disabled && day.getAttribute('aria-disabled') !== 'true',
  );
}

async function pickFirstOpenTime(dialog: HTMLElement): Promise<string> {
  await waitFor(() => expect(openDays(dialog).length).toBeGreaterThan(0), SERVICE_TIMEOUT);
  await userEvent.click(openDays(dialog)[0]);
  const [time] = await within(dialog).findAllByRole('button', { name: TIME_LABEL });
  await userEvent.click(time);

  return time.textContent ?? '';
}

async function sendRequest(note = NOTE) {
  const dialog = await openRequestDialog();
  const time = await pickFirstOpenTime(dialog);
  await userEvent.type(within(dialog).getByLabelText('Add a note for your coach (optional)'), note);
  await userEvent.click(within(dialog).getByRole('button', { name: `Request ${time}` }));
  await waitFor(
    () => expect(screen.queryByRole('dialog', { name: 'Request a check-in' })).not.toBeInTheDocument(),
    SERVICE_TIMEOUT,
  );
}

async function showTab(name: string) {
  await userEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));
}

async function openCheckinDevSettings() {
  await userEvent.click(screen.getByRole('button', { name: 'Open Dev Toggle' }));
  await userEvent.click(screen.getByRole('tab', { name: 'Check-ins' }));
}

function rowWith(text: string | RegExp): HTMLElement {
  const row = screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByText(text) !== null);
  if (!row) throw new Error(`No check-in row shows ${text}`);

  return row;
}

describe('requesting a check-in', () => {
  it('sends the picked time with her note and shows it waiting for her coach', async () => {
    // arrange
    renderPage();

    // act
    await sendRequest();

    // assert
    expect(await screen.findByText(/Check-in requested for/)).toBeInTheDocument();
    // act
    await showTab('Requests');
    // assert
    const row = rowWith(new RegExp(NOTE));
    expect(within(row).getByText('You:')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Cancel request' })).toBeEnabled();
  });

  it('offers only open times and steps the button from date to time to request', async () => {
    // arrange
    renderPage();
    const dialog = await openRequestDialog();
    await waitFor(() => expect(openDays(dialog).length).toBeGreaterThan(0), SERVICE_TIMEOUT);
    const stepButton = within(dialog).getByRole('button', { name: 'Select a date' });

    // act
    await userEvent.click(openDays(dialog)[0]);

    // assert
    expect(stepButton).toHaveAccessibleName('Select a time');
    expect(stepButton).toBeDisabled();
    expect(within(dialog).queryByText(/Booked/)).not.toBeInTheDocument();
    // act
    const [time] = within(dialog).getAllByRole('button', { name: TIME_LABEL });
    await userEvent.click(time);
    // assert
    expect(stepButton).toHaveAccessibleName(`Request ${time.textContent}`);
    expect(stepButton).toBeEnabled();
  });

  it('starts at the top of the dialog rather than in the note', async () => {
    // arrange
    renderPage();

    // act
    const dialog = await openRequestDialog();

    // assert
    expect(within(dialog).getByRole('heading', { level: 3, name: 'Request a check-in' })).toHaveFocus();
    expect(within(dialog).getByLabelText('Add a note for your coach (optional)')).not.toHaveFocus();
  });

  it('keeps her note, clears the time and stops offering a time that was just taken', async () => {
    // arrange
    renderPage('&ckservice=time-taken');
    const dialog = await openRequestDialog();
    const time = await pickFirstOpenTime(dialog);
    const noteField = within(dialog).getByLabelText('Add a note for your coach (optional)');
    await userEvent.type(noteField, NOTE);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Request ${time}` }));

    // assert
    expect(
      await within(dialog).findByText(
        'That time is no longer free. Pick another one.',
        {},
        SERVICE_TIMEOUT,
      ),
    ).toBeInTheDocument();
    expect(noteField).toHaveValue(NOTE);
    expect(within(dialog).getByRole('button', { name: /^Select a (date|time)$/ })).toBeDisabled();
    await waitFor(() => expect(within(dialog).queryByRole('button', { name: time })).not.toBeInTheDocument());
    expect(within(dialog).queryByRole('button', { name: TIME_LABEL, pressed: true })).not.toBeInTheDocument();
  });

  it('says the open times could not load and loads them again on retry', async () => {
    // arrange
    renderPage('&ckservice=fails');
    const dialog = await openRequestDialog();
    await within(dialog).findByText("We couldn't load the open times just now.", {}, SERVICE_TIMEOUT);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));

    // assert
    expect(within(dialog).getByRole('status')).toHaveTextContent('Loading open times…');
    expect(
      await within(dialog).findByText("We couldn't load the open times just now.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Select a date' })).toBeDisabled();
  });

  it('holds back a second request while one waits, with the reason', async () => {
    // arrange
    renderPage();

    // act
    await sendRequest();

    // assert
    for (const button of requestButtons()) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(WAITING_EXPLANATION);
    }
  });

  it('withdraws her waiting request and lets her ask again', async () => {
    // arrange
    renderPage();
    await sendRequest();
    await showTab('Requests');

    // act
    await userEvent.click(within(rowWith(new RegExp(NOTE))).getByRole('button', { name: 'Cancel request' }));

    // assert
    expect(await screen.findByText('Request cancelled', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(NOTE))).not.toBeInTheDocument();
    for (const button of requestButtons()) expect(button).toBeEnabled();
  });

  it('keeps her request when withdrawing it fails', async () => {
    // arrange
    renderPage('&ckservice=fails');
    await openCheckinDevSettings();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Client has an open request' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close Dev Settings' }));
    await showTab('Requests');
    const row = rowWith(/Can we look at my squat form\?/);
    const withdraw = within(row).getByRole('button', { name: 'Cancel request' });

    // act
    await userEvent.click(withdraw);

    // assert
    expect(within(row).getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
    expect(
      await screen.findByText("Your request wasn't cancelled. Try again.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Cancel request' })).toBeEnabled();
  });
});

describe('her check-ins when there is nothing to show', () => {
  it('explains the empty requests tab', async () => {
    // arrange
    renderPage();
    await openCheckinDevSettings();
    await userEvent.click(screen.getByRole('combobox', { name: 'Pending check-ins' }));
    await userEvent.click(await screen.findByRole('option', { name: 'None pending' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close Dev Settings' }));

    // act
    await showTab('Requests');

    // assert
    expect(screen.getByText('No open requests')).toBeInTheDocument();
    expect(
      screen.getByText('Requests you send and proposals from your coach show up here.'),
    ).toBeInTheDocument();
  });
});

describe('joining her check-in', () => {
  it('links each upcoming check-in to its own join page', () => {
    // arrange
    renderPage();

    // act
    const links = screen.getAllByRole('link', { name: 'Join Meet' });

    // assert
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/portal\/checkins\/[\w-]+\/join$/));
  });

  it('sends her to the coach meeting room for an approved check-in', async () => {
    // arrange
    const path = '/portal/checkins/ck-1/join?session=client&meetlink=set';
    const assign = vi.fn();
    window.history.replaceState({}, '', path);
    vi.stubGlobal('location', { ...window.location, assign });

    // act
    renderAt(path);

    // assert
    await waitFor(() => expect(assign).toHaveBeenCalledWith(PROTOTYPE_MEETING_LINK));
    expect(screen.getByRole('status')).toHaveTextContent('Taking you to your check-in…');
  });

  it('tells her the link is not ready while the coach has no meeting room', () => {
    // arrange
    // act
    renderAt('/portal/checkins/ck-1/join?session=client');

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: "Your check-in link isn't ready yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to check-ins/ })).toHaveAttribute(
      'href',
      '/portal/checkins',
    );
  });

  it.each([
    ['an unknown check-in', 'nope'],
    ['a check-in still waiting for an answer', 'ck-10'],
    ['a check-in that has passed', 'ck-6'],
    ['another client’s check-in', 'ck-3'],
  ])('answers not found for %s', (_case, checkinId) => {
    // arrange
    // act
    renderAt(`/portal/checkins/${checkinId}/join?session=client&meetlink=set`);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
