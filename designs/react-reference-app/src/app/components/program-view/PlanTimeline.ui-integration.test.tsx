import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays } from 'date-fns';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { WEEKDAYS, type Block, type BlockType } from '../../domain/program';
import { PlanTimeline, type TimelineWeekAction } from './PlanTimeline';

const dayOne = new Date(2026, 8, 7);

function block(type: BlockType, weeks: number): Block {
  const calendar = Object.fromEntries(WEEKDAYS.map(weekday => [weekday, { kind: 'rest' }]));
  return { id: `${type}-${weeks}`, originId: type, type, weeks, sessions: [], cardio: [], calendar } as unknown as Block;
}

const blocks = [block('foundation', 4), block('hypertrophy', 6), block('deload', 1)];

function showIn(onSelect = vi.fn()): TimelineWeekAction {
  return { kind: 'select', label: 'Show in the week card', onSelect };
}

function weekNames(): string[] {
  return within(screen.getByRole('toolbar', { name: 'Plan weeks' }))
    .getAllByRole('button')
    .map(cell => cell.getAttribute('aria-label') ?? '');
}

describe('PlanTimeline', () => {
  it('lists each block over its own weeks and names every week in full, led by what choosing it does', () => {
    // arrange
    const today = addDays(dayOne, 30);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} weekAction={showIn()} />);

    // assert
    const blockItems = within(screen.getByRole('list', { name: 'Plan blocks' })).getAllByRole('listitem', { current: 'step' });
    expect(blockItems).toHaveLength(1);
    expect(within(blockItems[0]).getByRole('list', { name: 'Hypertrophy weeks' })).toBeInTheDocument();
    const names = weekNames();
    expect(names).toHaveLength(11);
    expect(names[2]).toBe('Show in the week card: Week 3 of 11, 21 Sep to 27 Sep, Foundation block, week 3 of 4, check-in form Mon 21 Sep');
    expect(names[4]).toBe('Show in the week card: Week 5 of 11, 5 Oct to 11 Oct, Hypertrophy block, week 1 of 6, check-in form Mon 5 Oct, this week');
    expect(screen.getByText('Check-in form day, every two weeks')).toBeInTheDocument();
  });

  it('names the weeks without dates, check-in forms or this week before day 1 is set', () => {
    // arrange
    const today = dayOne;

    // act
    render(<PlanTimeline blocks={blocks} dayOne={null} preferredWeekday="mon" today={today} weekAction={showIn()} />);

    // assert
    expect(weekNames()[0]).toBe('Show in the week card: Week 1 of 11, Foundation block, week 1 of 4');
    expect(screen.queryByText('Check-in form day, every two weeks')).not.toBeInTheDocument();
  });

  it('marks no week as this week once the plan has ended', () => {
    // arrange
    const today = addDays(dayOne, 11 * 7);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} weekAction={showIn()} />);

    // assert
    expect(weekNames().filter(name => name.endsWith('this week'))).toEqual([]);
  });

  it('moves across the weeks with the arrow keys and chooses a week with Enter or Space', async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} shownWeek={5} weekAction={showIn(onSelect)} />);
    await user.tab();

    // act
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}{ArrowRight} ');

    // assert
    expect(onSelect.mock.calls).toEqual([[7], [8]]);
  });

  it('chooses a week on a click and keeps peeking the next week hovered', async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} shownWeek={5} weekAction={showIn(onSelect)} />);

    // act
    await user.click(screen.getByRole('button', { name: /Week 7 of 11,/ }));
    await user.hover(screen.getByRole('button', { name: /Week 8 of 11,/ }));

    // assert
    expect(onSelect).toHaveBeenCalledWith(7);
    expect(await screen.findByText('Hypertrophy, week 4 of 6')).toBeInTheDocument();
  });

  it('peeks a week on keyboard focus, says when it is already shown and closes the peek on Escape', async () => {
    // arrange
    const user = userEvent.setup();
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} shownWeek={5} weekAction={showIn()} />);

    // act
    await user.tab();

    // assert
    expect(await screen.findByText('Shown in the week card')).toBeInTheDocument();

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => expect(screen.queryByText('Shown in the week card')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Week 5 of 11,/ })).toHaveFocus();
  });

  it('links every week to its page when the action is a link', () => {
    // arrange
    const weekAction: TimelineWeekAction = { kind: 'link', label: 'Open in the program', hrefOf: week => `/program?week=${week}` };

    // act
    render(
      <MemoryRouter>
        <PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} weekAction={weekAction} />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole('link', { name: /^Open in the program: Week 7 of 11,/ })).toHaveAttribute('href', '/program?week=7');
  });
});
