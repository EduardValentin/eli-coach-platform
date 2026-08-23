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

const goalChip = (name: string) => {
  const group = screen.getByText('Goals').closest('fieldset') as HTMLElement;
  return within(group).getByRole('button', { name });
};

const equipmentChip = (name: string) => {
  const group = screen
    .getByText('Equipment', { selector: 'legend' })
    .closest('fieldset') as HTMLElement;
  return within(group).getByRole('button', { name });
};

describe("the plan builder's exercise library panel", () => {
  it('filters by goal tag through the same vocabulary as the library tab', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(goalChip('Recovery'));

    // assert
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens rather than intersects when a second goal tag is picked', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await user.click(goalChip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(goalChip('Strength'));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('no longer excludes everything when both equipment chips are picked', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(equipmentChip('Equipment'));
    await user.click(equipmentChip('No Equipment'));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('shows its empty state when the goal and equipment groups cannot both be met', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act — no Strength-tagged exercise is equipment-free
    await user.click(goalChip('Strength'));
    await user.click(equipmentChip('No Equipment'));

    // assert
    expect(screen.getByText('No exercises match your filters.')).toBeInTheDocument();
  });

  it('counts the active filters on the popover trigger', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await user.click(goalChip('Recovery'));

    // assert
    expect(screen.getByRole('button', { name: /Filters \(1\)/ })).toBeInTheDocument();
  });

});
