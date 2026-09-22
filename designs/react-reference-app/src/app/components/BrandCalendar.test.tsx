import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandCalendar } from './BrandCalendar';

const FIVE_WEEK_MONTH = new Date(2026, 8, 1);
const WEEK_ROWS_IN_EVERY_MONTH = 6;

function isWeekRow(row: HTMLElement): boolean {
  return within(row).queryAllByRole('gridcell').length > 0;
}

describe('BrandCalendar', () => {
  it('keeps six week rows for a month that spans five weeks', () => {
    // act
    render(
      <BrandCalendar mode="single" month={FIVE_WEEK_MONTH} onSelect={() => {}} />,
    );

    // assert
    const weekRows = within(screen.getByRole('grid'))
      .getAllByRole('row')
      .filter(isWeekRow);
    expect(weekRows).toHaveLength(WEEK_ROWS_IN_EVERY_MONTH);
  });
});
