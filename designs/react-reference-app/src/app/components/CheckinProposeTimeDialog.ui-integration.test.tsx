import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckinProposeTimeDialog } from './CheckinProposeTimeDialog';
import { AppProvider, useAppState } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { CheckinProvider, useCheckins } from '../context/CheckinContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { ClientProfileProvider } from '../context/ClientProfileContext';
import type { CheckIn } from '../domain/checkins';
import { formatCheckinDate, formatCheckinTime } from '../utils/dateFormatters';

const SERVICE_TIMEOUT = { timeout: 4000 };
const TIME_LABEL = /^\d{1,2}:\d{2}\s?[AP]M$/;
const NOTE = 'Thursday works better for me.';
const NOTE_LABEL = 'Add a note for Jessica';
const JESSICA_UPCOMING = 'ck-3';

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

type Harness = {
  checkinId: string;
  onOpenChange: (open: boolean) => void;
  onProposed: (checkin: CheckIn) => void;
  seen: { checkin?: CheckIn };
};

function ProposingCoach({ checkinId, onOpenChange, onProposed, seen }: Harness) {
  const { findCheckin } = useCheckins();
  const checkin = findCheckin(checkinId) ?? null;
  seen.checkin ??= checkin ?? undefined;

  return (
    <CheckinProposeTimeDialog
      checkin={checkin}
      party="coach"
      noteLabel={NOTE_LABEL}
      onOpenChange={onOpenChange}
      onProposed={onProposed}
    />
  );
}

function renderDialog({ checkinId = JESSICA_UPCOMING, devParams = '' } = {}) {
  const path = `/coach/checkins?session=coach${devParams}`;
  window.history.replaceState({}, '', path);
  const onProposed = vi.fn();
  const onOpenChange = vi.fn();
  const seen: Harness['seen'] = {};

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CheckinProvider>
                <ProposingCoach
                  checkinId={checkinId}
                  onOpenChange={onOpenChange}
                  onProposed={onProposed}
                  seen={seen}
                />
                <ServiceFailureStandIn />
              </CheckinProvider>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );

  return {
    dialog: screen.getByRole('dialog', { name: 'Propose a new time' }),
    current: seen.checkin as CheckIn,
    onProposed,
    onOpenChange,
  };
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

describe('proposing a new time for a check-in', () => {
  it('says when the check-in is set for now and asks for the note in the viewer words', () => {
    // arrange
    // act
    const { dialog, current } = renderDialog();

    // assert
    expect(dialog).toHaveAccessibleDescription(
      `Currently set for ${formatCheckinDate(current.date)} · ${formatCheckinTime(current.time)}`,
    );
    expect(within(dialog).getByLabelText(NOTE_LABEL)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Select a date' })).toBeDisabled();
  });

  it('proposes the picked time with the note and keeps the earlier time', async () => {
    // arrange
    const { dialog, current, onProposed, onOpenChange } = renderDialog();
    const time = await pickFirstOpenTime(dialog);
    await userEvent.type(within(dialog).getByLabelText(NOTE_LABEL), NOTE);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Propose ${time}` }));

    // assert
    expect(within(dialog).getByRole('button', { name: 'Proposing…' })).toBeDisabled();
    await waitFor(() => expect(onProposed).toHaveBeenCalledOnce(), SERVICE_TIMEOUT);
    expect(onProposed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: JESSICA_UPCOMING,
        status: 'pending',
        proposedBy: 'coach',
        previousDate: current.date,
        previousTime: current.time,
        rescheduleCount: current.rescheduleCount + 1,
        newTimeNote: NOTE,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the note, clears the time and asks for another one when the time was just taken', async () => {
    // arrange
    const { dialog, onProposed } = renderDialog({ devParams: '&ckservice=time-taken' });
    const time = await pickFirstOpenTime(dialog);
    const noteField = within(dialog).getByLabelText(NOTE_LABEL);
    await userEvent.type(noteField, NOTE);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Propose ${time}` }));

    // assert
    expect(
      await within(dialog).findByText('That time is no longer free. Pick another one.', {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(noteField).toHaveValue(NOTE);
    expect(within(dialog).getByRole('button', { name: /^Select a (date|time)$/ })).toBeDisabled();
    expect(onProposed).not.toHaveBeenCalled();
  });

  it('says the check-in cannot be moved again once it has been moved twice', async () => {
    // arrange
    const { dialog, onProposed } = renderDialog({ checkinId: 'ck-16' });
    const time = await pickFirstOpenTime(dialog);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Propose ${time}` }));

    // assert
    expect(
      await within(dialog).findByText("This check-in can't be moved any more.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(onProposed).not.toHaveBeenCalled();
  });

  it('says the check-in no longer waits for an answer from the one proposing', async () => {
    // arrange
    const { dialog, onProposed } = renderDialog({ checkinId: 'ck-13' });
    const time = await pickFirstOpenTime(dialog);

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Propose ${time}` }));

    // assert
    expect(
      await within(dialog).findByText(
        'This request is no longer waiting for an answer.',
        {},
        SERVICE_TIMEOUT,
      ),
    ).toBeInTheDocument();
    expect(onProposed).not.toHaveBeenCalled();
  });

  it('asks to try again when proposing fails, keeping the picked time', async () => {
    // arrange
    const { dialog, onProposed } = renderDialog();
    const time = await pickFirstOpenTime(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'stand in for the service failing', hidden: true }));

    // act
    await userEvent.click(within(dialog).getByRole('button', { name: `Propose ${time}` }));

    // assert
    expect(
      await within(dialog).findByText("The new time wasn't proposed. Try again.", {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: `Propose ${time}` })).toBeEnabled();
    expect(onProposed).not.toHaveBeenCalled();
  });

  it('offers no time once the client coaching has ended', async () => {
    // arrange
    // act
    const { dialog } = renderDialog({
      checkinId: 'ck-1',
      devParams: '&jstage=submitted&jsub=ended',
    });

    // assert
    expect(
      await within(dialog).findByText('There are no open times in the next 30 days.', {}, SERVICE_TIMEOUT),
    ).toBeInTheDocument();
    expect(openDays(dialog)).toHaveLength(0);
  });
});
