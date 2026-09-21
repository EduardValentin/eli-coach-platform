import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentSlotPicker } from './AssessmentSlotPicker';

const TIME_ZONE = 'Europe/Bucharest';
const TODAY = new Date('2026-10-20T06:00:00.000Z');
const BEFORE_THE_CLOCKS_CHANGE = new Date('2026-10-23T07:00:00.000Z');
const AFTER_THE_CLOCKS_CHANGE = new Date('2026-10-27T08:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderPicker() {
  const user = userEvent.setup();
  render(
    <AssessmentSlotPicker
      slots={[BEFORE_THE_CLOCKS_CHANGE, AFTER_THE_CLOCKS_CHANGE]}
      timeZone={TIME_ZONE}
      selectedSlot={null}
      onSelectSlot={() => {}}
    />,
  );
  return user;
}

function dayButton(isoDay: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    `td[data-day="${isoDay}"] button`,
  );
  if (!button) throw new Error(`No day button for ${isoDay}`);
  return button;
}

describe('AssessmentSlotPicker', () => {
  it('names a past day with day-first wording and its refusal reason', () => {
    // arrange
    // act
    renderPicker();

    // assert
    expect(dayButton('2026-10-19')).toHaveAccessibleName(
      'Monday, 19 October 2026, Past day',
    );
  });

  it('names today with day-first wording and its refusal reason', () => {
    // arrange
    // act
    renderPicker();

    // assert
    expect(dayButton('2026-10-20')).toHaveAccessibleName(
      'Today, Tuesday, 20 October 2026, No open slots',
    );
  });

  it('names a future unavailable day with day-first wording and its refusal reason', () => {
    // arrange
    // act
    renderPicker();

    // assert
    expect(dayButton('2026-10-21')).toHaveAccessibleName(
      'Wednesday, 21 October 2026, No open slots',
    );
  });

  it('shows the picked day\'s times past a clock change', async () => {
    // arrange
    const user = renderPicker();

    // act
    await user.click(dayButton('2026-10-27'));

    // assert
    expect(screen.getByRole('button', { name: /^10:00\s?AM$/i })).toBeInTheDocument();
  });

  it('moves keyboard focus to the next open day and selects it on Enter', async () => {
    // arrange
    const user = renderPicker();
    act(() => dayButton('2026-10-23').focus());

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    expect(dayButton('2026-10-27')).toHaveFocus();

    // act
    await user.keyboard('{Enter}');

    // assert
    expect(dayButton('2026-10-27').closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(dayButton('2026-10-27')).toHaveAccessibleName(
      'Tuesday, 27 October 2026, selected',
    );
    expect(screen.getByRole('button', { name: /^10:00\s?AM$/i })).toBeInTheDocument();
  });
});
