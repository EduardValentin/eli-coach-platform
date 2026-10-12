import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
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

function renderHub(path = '/coach/training') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProvider>
        <ClientProfileProvider>
          <TrainingProvider>
            <TrainingHub />
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
    expect(screen.getByText('Overhead Press')).toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
    expect(screen.queryByText('Walking Lunges')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 14')).toBeInTheDocument();
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
    expect(screen.getByRole('checkbox', { name: 'Recovery 4' })).toBeInTheDocument();
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
    expect(names[0]).toMatch(/^Couch Stretch/);
  });

  it('shows each exercise its tags so the coach can see why a row matched', () => {
    // arrange
    // act
    renderLibrary();

    // assert
    expect(within(exerciseRow('Bike Intervals')).getByText('Recovery')).toBeInTheDocument();
  });

  it('shows a tag added through the modal on the exercise row', async () => {
    // arrange
    const user = renderLibrary();
    expect(within(exerciseRow('Bike Intervals')).queryByText('Strength')).not.toBeInTheDocument();

    // act
    await chooseAction(user, 'Bike Intervals', 'Edit');
    await user.click(
      within(screen.getByRole('group', { name: 'Tags' })).getByRole('button', { name: 'Strength' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert
    expect(within(exerciseRow('Bike Intervals')).getByText('Strength')).toBeInTheDocument();
  });

  it('finds an exercise a coach marked Bodyweight under the no-equipment filter', async () => {
    // arrange
    const user = renderLibrary();
    await chooseAction(user, 'Plank', 'Edit');
    await user.click(screen.getByRole('button', { name: 'Bodyweight' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // act
    await chooseOption(user, 'Equipment', 'No equipment');

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'New Exercise' })).toBeInTheDocument();
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

  it('counts the exercises in each status', async () => {
    // arrange
    const user = renderLibrary();

    // act
    await user.click(screen.getByRole('combobox', { name: 'Status' }));

    // assert
    expect(screen.getByRole('option', { name: 'Active 14' })).toBeInTheDocument();
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

  it('removes an unused exercise once confirmed', async () => {
    // arrange
    const user = renderLibrary();
    await chooseOption(user, 'Status', 'Archived');
    await chooseAction(user, 'Smith Machine Squat', 'Delete');

    // act
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete this exercise?' })).getByRole(
        'button',
        { name: 'Delete' },
      ),
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
