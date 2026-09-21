import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DateField } from './DateField';
import { DateRangeField, type IsoDateRange } from './DateRangeField';

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

function RangeHarness() {
  const [range, setRange] = useState<IsoDateRange>({ from: null, to: null });

  return (
    <DateRangeField
      aria-label="Date range"
      value={range}
      onChange={setRange}
      defaultMonth={new Date(2026, 8, 1)}
    />
  );
}

function SingleHarness() {
  const [value, setValue] = useState('');

  return (
    <DateField
      aria-label="Start date"
      value={value}
      onChange={setValue}
      defaultMonth={new Date(2026, 8, 1)}
    />
  );
}

async function openCalendar(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('button', { name }));
}

describe('the date range field', () => {
  it('reads as unset until the coach picks a range', () => {
    // arrange
    render(<RangeHarness />);

    // act
    const trigger = screen.getByRole('button', { name: 'Date range' });

    // assert
    expect(trigger).toHaveTextContent('Pick dates');
  });

  it('keeps the calendar open between the first and the second day', async () => {
    // arrange
    const user = userEvent.setup();
    render(<RangeHarness />);

    // act
    await openCalendar(user, 'Date range');
    await user.click(
      screen.getByRole('button', { name: 'Friday, September 18th, 2026' }),
    );

    // assert
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('closes on the second day and names the span it covers', async () => {
    // arrange
    const user = userEvent.setup();
    render(<RangeHarness />);

    // act
    await openCalendar(user, 'Date range');
    await user.click(
      screen.getByRole('button', { name: 'Friday, September 18th, 2026' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Tuesday, September 22nd, 2026' }),
    );

    // assert
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent(
      '18 Sep – 22 Sep 2026',
    );
  });
});

describe('the single date field', () => {
  it('closes on the one day it takes and names it', async () => {
    // arrange
    const user = userEvent.setup();
    render(<SingleHarness />);

    // act
    await openCalendar(user, 'Start date');
    await user.click(
      screen.getByRole('button', { name: 'Friday, September 18th, 2026' }),
    );

    // assert
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start date' })).toHaveTextContent(
      '18 September 2026',
    );
  });
});
