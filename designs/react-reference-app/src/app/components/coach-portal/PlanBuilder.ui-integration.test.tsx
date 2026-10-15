import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PlanBuilder } from './PlanBuilder';
import { AppProvider } from '../../context/AppContext';
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
    <MemoryRouter>
      <AppProvider>
        <TrainingProvider>
          <PlanBuilder
            headerCenter={<span>Test Plan</span>}
            headerRight={<span />}
            initialWeeks={makeRestWeek(dayZeroType)}
            onBack={() => {}}
          />
        </TrainingProvider>
      </AppProvider>
    </MemoryRouter>
  );
  return user;
}

type User = ReturnType<typeof userEvent.setup>;

async function chooseTags(user: User, tags: string[]) {
  await user.click(screen.getByRole('button', { name: /^Tags/ }));
  for (const tag of tags) {
    await user.click(screen.getByRole('checkbox', { name: new RegExp(tag) }));
  }
  await user.keyboard('{Escape}');
}

async function chooseNoEquipment(user: User) {
  await user.click(screen.getByRole('combobox', { name: 'Equipment' }));
  await user.click(screen.getByRole('option', { name: /No equipment/ }));
}

describe("the plan builder's exercise library panel", () => {
  it('leaves archived exercises out', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await chooseTags(user, ['Hypertrophy']);

    // assert
    expect(screen.getByText('Bulgarian Split Squat')).toBeInTheDocument();
    expect(screen.queryByText('Smith Machine Squat')).not.toBeInTheDocument();
  });

  it('filters by tag through the same vocabulary as the exercise library', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await chooseTags(user, ['Recovery']);

    // assert
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens rather than intersects when a second tag is picked', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await chooseTags(user, ['Recovery']);

    // act
    await chooseTags(user, ['Strength']);

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('says how many tags are chosen on the tag filter', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await chooseTags(user, ['Recovery']);

    // assert
    expect(screen.getByRole('button', { name: 'Tags, 1 selected' })).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises', async () => {
    // arrange
    const user = await renderBuilderLibrary();

    // act
    await chooseNoEquipment(user);

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await chooseTags(user, ['Strength']);
    await chooseNoEquipment(user);
    expect(screen.getByText('No exercises match')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('clears the panel search alongside the filters', async () => {
    // arrange
    const user = await renderBuilderLibrary();
    await chooseTags(user, ['Strength']);
    const search = screen.getByRole('searchbox', { name: 'Search exercises' });
    await user.type(search, 'plank');

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(search).toHaveValue('');
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });
});
