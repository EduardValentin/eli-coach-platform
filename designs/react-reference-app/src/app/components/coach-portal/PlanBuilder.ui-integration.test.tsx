import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlanBuilder } from './PlanBuilder';
import { TrainingProvider, type PlanWeek } from '../../context/TrainingContext';

/** One week of rest days, so every exercise name on screen comes from the library. */
function makeRestWeek(): PlanWeek[] {
  return [
    {
      id: 'w-1',
      order: 1,
      isDeload: false,
      days: Array.from({ length: 7 }).map((_, day) => ({
        id: `w-1-d${day}`,
        dayOfWeek: day,
        type: 'Rest' as const,
        exercises: [],
      })),
    },
  ];
}

async function renderBuilderLibrary() {
  const user = userEvent.setup();
  render(
    <TrainingProvider>
      <PlanBuilder
        headerCenter={<span>Test Plan</span>}
        headerRight={<span />}
        initialWeeks={makeRestWeek()}
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
    expect(screen.getByText('No exercises match these filters.')).toBeInTheDocument();
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
    expect(screen.getByText('No exercises match these filters.')).toBeInTheDocument();

    // act — the empty state's own clear action, not the popover's
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!);

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('closes the filters popover on Escape and returns focus to the trigger', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    const trigger = screen.getByRole('button', { name: /^Filters/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // act
    await user.keyboard('{Escape}');

    // assert
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the filters popover when the coach clicks the results behind it', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    const trigger = screen.getByRole('button', { name: /^Filters/ });

    // act
    await user.click(screen.getByText('Barbell Back Squat'));

    // assert
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
