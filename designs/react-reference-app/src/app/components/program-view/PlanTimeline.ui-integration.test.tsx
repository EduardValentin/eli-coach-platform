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

  it('heads each block with its number of weeks and its dates, and a one-week block with its dates alone', () => {
    // arrange
    const today = addDays(dayOne, 30);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} weekAction={showIn()} />);

    // assert
    expect(screen.getByText('4 weeks').parentElement).toHaveTextContent(/^4 weeks · 7 Sep–4 Oct$/);
    expect(screen.getByText('16–22 Nov').parentElement).toHaveTextContent(/^16–22 Nov$/);
    expect(screen.queryByText('1 week')).not.toBeInTheDocument();
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

  it('names a one-week block without a week of block, whichever way the cell leads', () => {
    // arrange
    const today = addDays(dayOne, 30);

    // act
    const { unmount } = render(<PlanTimeline blocks={blocks} dayOne={null} preferredWeekday="mon" today={today} weekAction={showIn()} />);
    const actionFirst = weekNames()[10];
    unmount();
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} weekAction={{ kind: 'open-block', onOpen: vi.fn() }} />);

    // assert
    expect(actionFirst).toBe('Show in the week card: Week 11 of 11, Deload block');
    expect(weekNames()[10]).toMatch(/^Week 11 of 11, 16 Nov to 22 Nov, Deload, /);
    expect(weekNames()[0]).toBe('Week 1 of 11, 7 Sep to 13 Sep, Foundation week 1 of 4, open block');
  });

  it('dates the weeks of a timeline that opens blocks from today until day 1 is set, marking no week as this week', async () => {
    // arrange
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<PlanTimeline blocks={blocks} dayOne={null} preferredWeekday="mon" today={dayOne} weekAction={{ kind: 'open-block', onOpen }} />);

    // act
    await user.click(screen.getByRole('button', { name: /^Week 6 of 11, / }));

    // assert
    expect(weekNames()[0]).toBe('Week 1 of 11, 7 Sep to 13 Sep, Foundation week 1 of 4, open block');
    expect(weekNames().filter(name => name.includes('this week'))).toEqual([]);
    expect(within(screen.getByRole('list', { name: 'Plan blocks' })).queryAllByRole('listitem', { current: 'step' })).toEqual([]);
    expect(screen.getByText('Check-in form day, every two weeks, on Mondays')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledWith(1);
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

  it('lists the weeks as plain text without a toolbar, peeks or this week when the action is none', async () => {
    // arrange
    const user = userEvent.setup();
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} weekAction={{ kind: 'none' }} />);

    // act
    await user.tab();

    // assert
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
    const foundationWeeks = within(screen.getByRole('list', { name: 'Foundation weeks' })).getAllByRole('listitem');
    expect(within(foundationWeeks[2]).getByText('Week 3 of 11, 21 Sep to 27 Sep, Foundation block, week 3 of 4, check-in form Mon 21 Sep')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Plan blocks' })).queryAllByRole('listitem', { current: 'step' })).toEqual([]);
    expect(screen.queryByText(/this week|Now/)).not.toBeInTheDocument();
    expect(screen.getByText('4 weeks')).toBeInTheDocument();
    expect(screen.getByText('7 Sep–4 Oct')).toBeInTheDocument();
  });

  it('dates every week of a static timeline by its start and names the check-in weekday in the key', () => {
    // arrange
    const today = addDays(dayOne, 30);

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={today} weekAction={{ kind: 'none' }} />);

    // assert
    const foundationWeeks = within(screen.getByRole('list', { name: 'Foundation weeks' })).getAllByRole('listitem');
    expect(within(foundationWeeks[0]).getByText('7 Sep')).toBeInTheDocument();
    expect(within(foundationWeeks[2]).getByText('21 Sep')).toBeInTheDocument();
    expect(within(foundationWeeks[2]).getByText('Week 3 of 11, 21 Sep to 27 Sep, Foundation block, week 3 of 4, check-in form Mon 21 Sep')).toBeInTheDocument();
    expect(screen.getByText('Check-in form day, every two weeks, on Mondays')).toBeInTheDocument();
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

  it('jumps from a week to its place on the page in a static list, and leaves a week without one plain', () => {
    // arrange
    const weekAction: TimelineWeekAction = { kind: 'anchor', hrefOf: week => (week >= 5 ? `#week-${week}` : null) };

    // act
    render(<PlanTimeline blocks={blocks} dayOne={dayOne} preferredWeekday="mon" today={addDays(dayOne, 30)} weekAction={weekAction} />);

    // assert
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Week 5 of 11, 5 Oct to 11 Oct,/ })).toHaveAttribute('href', '#week-5');
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.queryByRole('link', { name: /^Week 4 of 11,/ })).not.toBeInTheDocument();
    expect(screen.getByText(/^Week 4 of 11,/)).toBeInTheDocument();
    expect(screen.queryByText(/this week|Now/)).not.toBeInTheDocument();
  });
});
