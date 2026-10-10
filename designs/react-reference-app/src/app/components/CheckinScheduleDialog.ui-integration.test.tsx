import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckinScheduleDialog, type ScheduledClient } from './CheckinScheduleDialog';
import { AppProvider, useAppState } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider } from '../context/CheckinContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';

const SERVICE_TIMEOUT = { timeout: 4000 };
const TIME_LABEL = /^\d{1,2}:\d{2}\s?[AP]M$/;
const NOTE = 'Let us look at your squat depth.';
const CLIENT: ScheduledClient = { id: 'c2', name: 'Jessica Alba', firstName: 'Jessica' };
const NOTE_LABEL = 'Add a note for Jessica (optional)';

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
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

function ServiceFailureStandIn() {
  const { setAppState } = useAppState();

  return (
    <button type="button" onClick={() => setAppState({ checkinService: 'fails' })}>
      stand in for the service failing
    </button>
  );
}

function renderDialog(devParams = '') {
  const path = `/coach/clients/c2?session=coach${devParams}`;
  window.history.replaceState({}, '', path);
  const onScheduled = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <CheckinScheduleDialog
                  open
                  onOpenChange={onOpenChange}
                  client={CLIENT}
                  onScheduled={onScheduled}
                />
                <ServiceFailureStandIn />
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return { dialog: screen.getByRole('dialog', { name: 'Schedule a check-in with Jessica' }), onScheduled, onOpenChange };
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

describe('the coach scheduling a check-in', () => {
  it('names the client and says she answers it', () => {
    // arrange
    // act
    const { dialog } = renderDialog();

    // assert
    expect(dialog).toHaveAccessibleDescription('Pick a date and time. Jessica will approve or decline it.');
    expect(within(dialog).getByLabelText(NOTE_LABEL)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Select a date' })).toBeDisabled();
  });

  it('schedules the picked time with her note', async () => {
    // arrange
    const { dialog, onScheduled, onOpenChange } = renderDialog();
    const time = await pickFirstOpenTime(dialog);
    await userEvent.type(within(dialog).getByLabelText(NOTE_LABEL), NOTE);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Schedule ${time}` }));

    // assert
    expect(within(dialog).getByRole('button', { name: 'Scheduling…' })).toBeDisabled();
    await waitFor(() => expect(onScheduled).toHaveBeenCalledOnce(), SERVICE_TIMEOUT);
    expect(onScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c2',
        kind: 'ad-hoc',
        status: 'pending',
        initiatedBy: 'coach',
        proposedBy: 'coach',
        note: NOTE,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the note, clears the time and asks for another one when the time was just taken', async () => {
    // arrange
    const { dialog, onScheduled } = renderDialog('&ckservice=time-taken');
    const time = await pickFirstOpenTime(dialog);
    const noteField = within(dialog).getByLabelText(NOTE_LABEL);
    await userEvent.type(noteField, NOTE);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Schedule ${time}` }));

    // assert
    expect(
      await within(dialog).findByText('That time is no longer free. Pick another one.', {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(noteField).toHaveValue(NOTE);
    expect(within(dialog).getByRole('button', { name: /^Select a (date|time)$/ })).toBeDisabled();
    expect(onScheduled).not.toHaveBeenCalled();
  });

  it('says the client cannot answer a check-in right now', async () => {
    // arrange
    const { dialog, onScheduled } = renderDialog('&ckservice=cannot-answer');
    const time = await pickFirstOpenTime(dialog);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Schedule ${time}` }));

    // assert
    expect(
      await within(dialog).findByText("Jessica can't answer a check-in right now.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(onScheduled).not.toHaveBeenCalled();
  });

  it('asks to try again when scheduling fails, keeping the picked time', async () => {
    // arrange
    const { dialog, onScheduled } = renderDialog();
    const time = await pickFirstOpenTime(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'stand in for the service failing', hidden: true }));

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Schedule ${time}` }));

    // assert
    expect(
      await within(dialog).findByText("The check-in wasn't scheduled. Try again.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: `Schedule ${time}` })).toBeEnabled();
    expect(onScheduled).not.toHaveBeenCalled();
  });
});
