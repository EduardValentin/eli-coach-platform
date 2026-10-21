import { render, screen, within } from '@testing-library/react';
import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Block, BlockType } from '../../../domain/program';
import { PlanTimeline } from './PlanTimeline';

const dayOne = new Date(2026, 8, 7);

function block(type: BlockType, weeks: number): Block {
  return { id: `${type}-${weeks}`, originId: type, type, weeks } as Block;
}

const blocks = [block('foundation', 4), block('hypertrophy', 6), block('deload', 1)];

function timeline(): HTMLElement {
  return screen.getByRole('group', { name: 'Plan timeline' });
}

describe('PlanTimeline', () => {
  it('marks today with the week of the plan once day 1 is set', () => {
    // arrange
    const today = addDays(dayOne, 30);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} />);

    // assert
    expect(within(timeline()).getByText('Today · week 5')).toBeInTheDocument();
    const items = within(within(timeline()).getByRole('list', { name: 'Plan blocks' })).getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
  });

  it('shows no today marker before day 1 is set', () => {
    // arrange
    const today = dayOne;

    // act
    render(<PlanTimeline blocks={blocks} dayOne={null} preferredWeekday="mon" today={today} />);

    // assert
    expect(within(timeline()).queryByText(/^Today/)).not.toBeInTheDocument();
  });

  it('shows no today marker once the plan has ended', () => {
    // arrange
    const today = addDays(dayOne, 11 * 7);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} />);

    // assert
    expect(within(timeline()).queryByText(/^Today/)).not.toBeInTheDocument();
  });
});
