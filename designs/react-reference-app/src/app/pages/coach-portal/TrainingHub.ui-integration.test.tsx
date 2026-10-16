import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, describe, expect, it } from 'vitest';
import { TrainingHub } from './TrainingHub';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { TrainingProvider } from '../../context/TrainingContext';

type User = ReturnType<typeof userEvent.setup>;

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

function ExerciseEditorStandIn() {
  const { exerciseId } = useParams();
  const { state } = useLocation();
  return (
    <>
      <p>Exercise editor {exerciseId ?? 'new'}</p>
      <p data-testid="library-search">{state?.library}</p>
    </>
  );
}

function renderHub(path = '/coach/training') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <TrainingProvider>
            <Routes>
              <Route path="/coach/training" element={<TrainingHub />} />
              <Route path="/coach/training/exercises/new" element={<ExerciseEditorStandIn />} />
              <Route path="/coach/training/exercises/:exerciseId" element={<ExerciseEditorStandIn />} />
            </Routes>
            <Toaster />
          </TrainingProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

function renderLibrary(path?: string): User {
  renderHub(path);
  return userEvent.setup();
}

const exerciseRow = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

async function chooseTags(user: User, tags: string[]) {
  await user.click(screen.getByRole('button', { name: /^Tags/ }));
  for (const tag of tags) {
    await user.click(screen.getByRole('checkbox', { name: new RegExp(tag) }));
  }
  await user.keyboard('{Escape}');
}

async function chooseOption(user: User, filter: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: filter }));
  await user.click(screen.getByRole('option', { name: new RegExp(option) }));
}

async function chooseAction(user: User, exerciseName: string, action: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${exerciseName}` }));
  await user.click(screen.getByRole('menuitem', { name: action }));
}

describe('the exercise library filters', () => {
  it('lists the library a page at a time, alphabetically', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Lateral Raises')).toBeInTheDocument();
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
    expect(screen.queryByText('Walking Lunges')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 16')).toBeInTheDocument();
  });

  it('narrows the table to exercises carrying the selected tag', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseTags(user, ['Recovery']);

    // assert
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens the table when a second tag is selected, rather than intersecting', async () => {
    // arrange
    const user = renderLibrary();
    await chooseTags(user, ['Recovery']);

    // act
    await chooseTags(user, ['Strength']);

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('counts the exercises behind each tag', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Tags' }));

    // assert
    expect(screen.getByRole('checkbox', { name: 'Recovery 6' })).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseOption(user, 'Equipment', 'No equipment');

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('intersects the tags with the equipment filter', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseTags(user, ['Recovery']);
    await chooseOption(user, 'Equipment', 'No equipment');

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Romanian Deadlift')).not.toBeInTheDocument();
  });

  it('combines the filters with the search', async () => {
    // arrange
    const user = renderLibrary();
    await chooseTags(user, ['Recovery']);

    // act
    await user.type(screen.getByRole('searchbox', { name: 'Search exercises' }), 'squat');

    // assert
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
    expect(screen.getByText('No exercises match')).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    // arrange
    const user = renderLibrary();
    await chooseTags(user, ['Strength']);
    await chooseOption(user, 'Equipment', 'No equipment');
    expect(screen.getByText('Try another filter or search.')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Equipment' })).toHaveTextContent('Any equipment');
  });

  it('shows no clear action while no filter is set', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('reads its filters back from the link', () => {
    // arrange
    // act
    renderLibrary('/coach/training?tags=Recovery&equipment=none&q=pla');

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Romanian Deadlift')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search exercises' })).toHaveValue('pla');
  });

  it('sorts by difficulty from the column header', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Difficulty' }));

    // assert
    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(names[0]).toMatch(/^90\/90 Hip Switches/);
  });

  it('shows each exercise its tags so the coach can see why a row matched', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(within(exerciseRow('Bike Intervals')).getByText('Recovery')).toBeInTheDocument();
  });

  it("opens the exercise editor from a row's Edit action", async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseAction(user, 'Bike Intervals', 'Edit');

    // assert
    expect(screen.getByText('Exercise editor e14')).toBeInTheDocument();
  });

  it('hands the editor the filters it was opened from, so it can return to them', async () => {
    // arrange
    const user = renderLibrary('/coach/training?type=cardio');

    // act
    await chooseAction(user, 'Bike Intervals', 'Edit');

    // assert
    expect(screen.getByTestId('library-search')).toHaveTextContent('?type=cardio');
  });

  it('narrows to one type from the Type filter', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseOption(user, 'Type', 'Cardio');

    // assert
    expect(screen.getByText('Bike Intervals')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('offers every exercise type in the Type filter', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Type' }));

    // assert
    const labels = screen.getAllByRole('option').map((option) => option.textContent?.replace(/\s*\d*$/, ''));
    expect(labels).toEqual(['Any type', 'Resistance', 'Cardio', 'Mobility', 'Stretching', 'Breathing']);
  });

  it('narrows to stretching from the Type filter', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseOption(user, 'Type', 'Stretching');

    // assert
    expect(screen.getByText('Couch Stretch')).toBeInTheDocument();
    expect(screen.queryByText('90/90 Hip Switches')).not.toBeInTheDocument();
  });

  it('keeps the tag and equipment filters from an old link that names no type', () => {
    // arrange & act
    renderHub('/coach/training?session=coach&tags=Recovery&equipment=none');

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });
});

describe('the empty exercise library seed', () => {
  it('starts the library with no exercises', () => {
    // arrange
    window.history.replaceState(null, '', '/coach/training?session=coach&exseed=empty');

    // act
    renderHub('/coach/training?session=coach&exseed=empty');

    // assert
    expect(screen.getByText('No exercises yet')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });
});

describe('the Training page in MVP mode', () => {
  it('is the exercise library, without the plan tabs', () => {
    // arrange
    // act
    renderHub();

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Exercises' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New exercise' })).toBeInTheDocument();
  });

  it('opens the exercise editor from New exercise', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('link', { name: 'New exercise' }));

    // assert
    expect(screen.getByText('Exercise editor new')).toBeInTheDocument();
  });

  it('keeps the plan tabs in Post-MVP mode', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderHub();

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Training & Programs' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Client Plans' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exercise Library' })).toBeInTheDocument();
  });

  it('opens the tab the link names in Post-MVP mode', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderHub('/coach/training?tab=exercises&type=cardio');

    // assert
    expect(screen.getByRole('tab', { name: 'Exercise Library' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Bike Intervals')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('falls back to Client Plans for a tab it does not know', () => {
    // arrange
    window.history.replaceState(null, '', '/?scope=post-mvp');

    // act
    renderHub('/coach/training?tab=nope');

    // assert
    expect(screen.getByRole('tab', { name: 'Client Plans' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('archiving an exercise', () => {
  it('takes it out of the library list', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseAction(user, 'Barbell Back Squat', 'Archive');

    // assert
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
    expect(await screen.findByText('"Barbell Back Squat" archived')).toBeInTheDocument();
  });

  it('shows it under Archived, where Restore brings it back', async () => {
    // arrange
    const user = renderLibrary();
    await chooseAction(user, 'Barbell Back Squat', 'Archive');
    await chooseOption(user, 'Status', 'Archived');

    // act
    await chooseAction(user, 'Barbell Back Squat', 'Restore');
    await chooseOption(user, 'Status', 'Active');

    // assert
    expect(exerciseRow('Barbell Back Squat')).toBeInTheDocument();
    expect(await screen.findByText('"Barbell Back Squat" restored')).toBeInTheDocument();
  });

  it('restores under the next free number when an active exercise now holds its name', async () => {
    // arrange
    window.history.replaceState(null, '', '/coach/training?session=coach&exseed=clash');
    const user = renderLibrary('/coach/training?session=coach&exseed=clash');
    await chooseOption(user, 'Status', 'Archived');

    // act
    await chooseAction(user, 'Hip Thrust', 'Restore');
    await chooseOption(user, 'Status', 'Active');

    // assert
    expect(await screen.findByText('"Hip Thrust" restored as "Hip Thrust (2)"')).toBeInTheDocument();
    expect(exerciseRow('Hip Thrust (2)')).toBeInTheDocument();
    expect(exerciseRow('Hip Thrust')).toBeInTheDocument();
  });

  it('counts the exercises in each status', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Status' }));

    // assert
    expect(screen.getByRole('option', { name: 'Active 16' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Archived 1' })).toBeInTheDocument();
  });

  it('lists only archived exercises under Archived', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await chooseOption(user, 'Status', 'Archived');

    // assert
    expect(screen.getByText('Smith Machine Squat')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });
});

describe('deleting an exercise', () => {
  it('marks an exercise in use and says how often it is used', async () => {
    // arrange
    const user = renderLibrary();
    await user.click(
      within(exerciseRow('Barbell Back Squat')).getByRole('button', { name: 'Actions for Barbell Back Squat' }),
    );

    // act
    await user.hover(screen.getByRole('menuitem', { name: 'Delete' }));

    // assert
    expect(await screen.findByText(/^Used in 2 templates and \d+ plans?$/)).toBeInTheDocument();
  });

  it('is unavailable while a plan uses it', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('button', { name: 'Actions for Barbell Back Squat' }));

    // assert
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('asks to confirm, naming the exercise and saying it is removed for good', async () => {
    // arrange
    const user = renderLibrary();
    await chooseOption(user, 'Status', 'Archived');

    // act
    await chooseAction(user, 'Smith Machine Squat', 'Delete');

    // assert
    const confirmation = screen.getByRole('dialog', { name: 'Delete “Smith Machine Squat”?' });
    expect(confirmation).toHaveAccessibleDescription('It’s removed for good. This can’t be undone.');
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(confirmation).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('removes an unused exercise once confirmed', async () => {
    // arrange
    const user = renderLibrary();
    await chooseOption(user, 'Status', 'Archived');
    await chooseAction(user, 'Smith Machine Squat', 'Delete');

    // act
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete “Smith Machine Squat”?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    // assert
    expect(screen.queryByText('Smith Machine Squat')).not.toBeInTheDocument();
    expect(await screen.findByText('"Smith Machine Squat" deleted')).toBeInTheDocument();
  });

  it('keeps the exercise when the coach cancels', async () => {
    // arrange
    const user = renderLibrary();
    await chooseOption(user, 'Status', 'Archived');
    await chooseAction(user, 'Smith Machine Squat', 'Delete');

    // act
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // assert
    expect(screen.getByText('Smith Machine Squat')).toBeInTheDocument();
  });
});
