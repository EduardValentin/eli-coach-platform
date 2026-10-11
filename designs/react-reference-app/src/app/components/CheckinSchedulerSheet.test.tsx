import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckinSchedulerSheet, type OpenTimesListing } from './CheckinSchedulerSheet';

const TIME_ZONE = 'Europe/Bucharest';
const TODAY = new Date('2026-10-20T06:00:00.000Z');
const THURSDAY_EVENING = new Date('2026-10-22T14:00:00.000Z');
const FRIDAY_EVENING = new Date('2026-10-23T14:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function requestSheet(times: Date[]) {
  const openTimes: OpenTimesListing = { status: 'ready', times };

  return (
    <CheckinSchedulerSheet
      variant="request"
      open
      onOpenChange={() => {}}
      title="Request a check-in"
      wording={{
        noteLabel: 'Add a note for your coach (optional)',
        stepVerb: 'Request',
        busyLabel: 'Requesting…',
      }}
      openTimes={openTimes}
      onRetry={() => {}}
      timeZone={TIME_ZONE}
      selectedSlot={null}
      onSelectSlot={() => {}}
      note=""
      onNoteChange={() => {}}
      problem={null}
      submitting={false}
      onSubmit={() => {}}
    />
  );
}

function dayButton(isoDay: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(`td[data-day="${isoDay}"] button`);
  if (!button) throw new Error(`No day button for ${isoDay}`);

  return button;
}

describe('the check-in request sheet', () => {
  it('heads the sheet with its title alone', () => {
    // arrange
    const times = [THURSDAY_EVENING];

    // act
    render(requestSheet(times));

    // assert
    const dialog = screen.getByRole('dialog', { name: 'Request a check-in' });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByText('Check-in request')).not.toBeInTheDocument();
  });

  it('asks for a date again when the chosen day loses its last open time', async () => {
    // arrange
    const user = userEvent.setup();
    const { rerender } = render(requestSheet([THURSDAY_EVENING, FRIDAY_EVENING]));
    await user.click(dayButton('2026-10-22'));

    // act
    rerender(requestSheet([FRIDAY_EVENING]));

    // assert
    expect(screen.getByRole('button', { name: 'Select a date' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'Thursday, October 22' })).not.toBeInTheDocument();
  });

  it('keeps the chosen day while it still has open times', async () => {
    // arrange
    const user = userEvent.setup();
    const { rerender } = render(requestSheet([THURSDAY_EVENING, FRIDAY_EVENING]));
    await user.click(dayButton('2026-10-23'));

    // act
    rerender(requestSheet([FRIDAY_EVENING]));

    // assert
    expect(screen.getByRole('button', { name: 'Select a time' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Friday, October 23' })).toBeInTheDocument();
  });
});
