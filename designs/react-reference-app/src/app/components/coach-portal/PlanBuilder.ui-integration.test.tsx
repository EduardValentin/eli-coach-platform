import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlanBuilder } from './PlanBuilder';
import { TrainingProvider, type PlanWeek } from '../../context/TrainingContext';

/** One week of rest days, so every exercise name on screen comes from the library. */
function makeRestWeek(dayZeroType: 'Rest' | 'Strength' = 'Rest'): PlanWeek[] {
  return [
    {
      id: 'w-1',
      order: 1,
      isDeload: false,
      days: Array.from({ length: 7 }).map((_, day) => ({
        id: `w-1-d${day}`,
        dayOfWeek: day,
        type: (day === 0 ? dayZeroType : 'Rest') as 'Rest' | 'Strength',
        exercises: [],
      })),
    },
  ];
}

async function renderBuilderLibrary(dayZeroType: 'Rest' | 'Strength' = 'Rest') {
  const user = userEvent.setup();
  render(
    <TrainingProvider>
      <PlanBuilder
        headerCenter={<span>Test Plan</span>}
        headerRight={<span />}
        initialWeeks={makeRestWeek(dayZeroType)}
        onBack={() => {}}
      />
    </TrainingProvider>
  );
  await user.click(screen.getByRole('button', { name: /^Filters/ }));
  return user;
}

// Day-type buttons share names with the goal chips, so every chip lookup is
// scoped to its labelled group.
const tagChip = (name: string) =>
  within(screen.getByRole('group', { name: 'Tags' })).getByRole('button', { name });

const noEquipmentSwitch = () => screen.getByRole('switch', { name: 'No equipment only' });

describe("the plan builder's exercise library panel", () => {
  it('filters by tag through the same vocabulary as the library tab', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(tagChip('Recovery'));

    // assert
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens rather than intersects when a second tag is picked', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await user.click(tagChip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(tagChip('Strength'));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises when the switch is on', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(noEquipmentSwitch());

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('shows its empty state when the tags and the equipment switch cannot both be met', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act — no Strength-tagged exercise is equipment-free
    await user.click(tagChip('Strength'));
    await user.click(noEquipmentSwitch());

    // assert
    expect(screen.getByText('No exercises match your search and filters.')).toBeInTheDocument();
  });

  it('counts the active filters on the popover trigger', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(tagChip('Recovery'));

    // assert
    expect(screen.getByRole('button', { name: /Filters \(1\)/ })).toBeInTheDocument();
  });

  it('offers a way out of the empty state', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await user.click(tagChip('Strength'));
    await user.click(noEquipmentSwitch());
    expect(screen.getByText('No exercises match your search and filters.')).toBeInTheDocument();
    // dismiss the popover first: while it is open the next outside click is
    // swallowed by design, so it would not reach the empty state's action
    await user.keyboard('{Escape}');

    // act — the empty state's own clear action, not the popover's
    const emptyState = screen.getByText('No exercises match your search and filters.').closest('div') as HTMLElement;
    await user.click(within(emptyState).getByRole('button', { name: /^Clear/ }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('closes the filters popover on Escape and returns focus to the trigger', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    const trigger = screen.getByRole('button', { name: /^Filters/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // move focus off the trigger and into the popover, or the assertion below
    // passes on focus that never left
    await user.tab();
    expect(trigger).not.toHaveFocus();

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('dismisses on an outside click without letting that click reach what it covered', async () => {
    // arrange — the popover overlays the library, whose cards carry a quick-add
    const user = await renderBuilderLibrary('Strength');
    const trigger = screen.getByRole('button', { name: /^Filters/ });
    const quickAdd = screen.getAllByRole('button', { name: 'Add to current day' })[0];
    // the name appears once in the library; adding it to the day makes it two
    expect(screen.queryAllByText('Barbell Back Squat')).toHaveLength(1);

    // act
    await user.click(quickAdd);

    // assert — the popover closes, and the plan is untouched
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByText('Barbell Back Squat')).toHaveLength(1);
  });

  it('clears the panel search alongside the filters', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await user.click(tagChip('Recovery'));
    const search = screen.getByPlaceholderText('Search exercises...');
    await user.type(search, 'plank');

    // act
    await user.click(screen.getByRole('button', { name: /^Clear/ }));

    // assert
    expect(search).toHaveValue('');
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });
});
