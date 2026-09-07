import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TrainingHub } from './TrainingHub';
import { TrainingProvider } from '../../context/TrainingContext';

/** Opens the Exercise Library tab, where the filters live. */
async function renderLibrary() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <TrainingProvider>
        <TrainingHub />
      </TrainingProvider>
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Exercise Library' }));
  return user;
}

const tagChip = (name: string) =>
  within(screen.getByRole('group', { name: 'Tags' })).getByRole('button', { name });

const noEquipmentChip = () =>
  within(screen.getByRole('group', { name: 'Equipment' })).getByRole('button', { name: 'No equipment' });

describe('the Exercise Library filters', () => {
  it('lists the whole library before anything is filtered', async () => {
    // arrange & act
    await renderLibrary();

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('narrows the table to exercises carrying the selected tag', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(tagChip('Recovery'));

    // assert — only the two Recovery-tagged exercises survive
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens the table when a second tag is selected, rather than intersecting', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(tagChip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(tagChip('Strength'));

    // assert — Strength-only exercises join the Recovery-tagged ones
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises when the chip is pressed', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(noEquipmentChip());

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('intersects the tags with the equipment filter', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(tagChip('Recovery'));
    await user.click(noEquipmentChip());

    // assert — both are Recovery-tagged, but Romanian Deadlift needs a barbell
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Romanian Deadlift')).not.toBeInTheDocument();
  });

  it('lifts the equipment constraint again when the chip is unpressed', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(noEquipmentChip());
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(noEquipmentChip());

    // assert
    expect(noEquipmentChip()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('combines the filters with the existing search', async () => {
    // arrange
    const user = await renderLibrary();

    // act — every match for "squat" is Strength- or Hypertrophy-tagged, so the
    // tag group is the only thing that can exclude one
    await user.click(tagChip('Recovery'));
    await user.type(screen.getByPlaceholderText(/Search exercises/), 'squat');

    // assert
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
    expect(screen.queryByText('Bulgarian Split Squat')).not.toBeInTheDocument();
    expect(screen.getByText(/No exercises match/)).toBeInTheDocument();
  });

  it('shows the empty state when no exercise matches', async () => {
    // arrange
    const user = await renderLibrary();

    // act — nothing is both Strength-tagged and equipment-free
    await user.click(tagChip('Strength'));
    await user.click(noEquipmentChip());

    // assert
    expect(screen.getByText(/No exercises match/)).toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
  });

  it('restores the full library through the clear action', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(tagChip('Recovery'));
    await user.click(noEquipmentChip());
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    // the switch is a controlled input: clearing must visibly reset it too
    expect(noEquipmentChip()).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the clear action focusable while it works, rather than unmounting it', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(tagChip('Recovery'));
    const clear = screen.getByRole('button', { name: 'Clear search and filters' });
    clear.focus();

    // act
    await user.keyboard('{Enter}');

    // assert — the control stays mounted, focusable and in the tab order, so a
    // keyboard user is never left with focus on the document body.
    expect(document.activeElement).toBe(clear);
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('shows each exercise its tags so the coach can see why a row matched', async () => {
    // arrange
    await renderLibrary();
    const plankRow = screen.getByText('Plank').closest('tr') as HTMLElement;

    // act & assert
    expect(within(plankRow).getByText('Recovery')).toBeInTheDocument();
  });

  it('shows a tag added through the modal on the exercise row', async () => {
    // arrange
    const user = await renderLibrary();
    const plankRow = () => screen.getByText('Plank').closest('tr') as HTMLElement;
    expect(within(plankRow()).queryByText('Strength')).not.toBeInTheDocument();

    // act — edit Plank through the real modal and add a tag
    await user.click(within(plankRow()).getByRole('button', { name: 'Edit' }));
    // The filter block and the modal now both say "Tags" — that shared wording is
    // the point; the modal's group is the later of the two in the DOM.
    const tagGroups = screen.getAllByRole('group', { name: 'Tags' });
    const modalTags = tagGroups[tagGroups.length - 1];
    await user.click(within(modalTags).getByRole('button', { name: 'Strength' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert — the visible row, not provider state
    expect(within(plankRow()).getByText('Strength')).toBeInTheDocument();
  });

  it('offers a way out of the empty state', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(tagChip('Strength'));
    await user.click(noEquipmentChip());
    expect(screen.getByText('No exercises match your search and filters.')).toBeInTheDocument();

    // act
    await user.click(screen.getAllByRole('button', { name: 'Clear search and filters' }).at(-1)!);

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('clears the search alongside the filters', async () => {
    // arrange
    const user = await renderLibrary();
    const search = screen.getByPlaceholderText(/Search exercises/);
    await user.type(search, 'plank');
    await user.click(tagChip('Recovery'));

    // act
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));

    // assert
    expect(search).toHaveValue('');
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('finds an exercise a coach marked Bodyweight under the no-equipment filter', async () => {
    // arrange — no seeded exercise is bodyweight, so author one the way a coach would
    const user = await renderLibrary();
    const plankRow = screen.getByText('Plank').closest('tr') as HTMLElement;
    await user.click(within(plankRow).getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Bodyweight' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // act
    await user.click(noEquipmentChip());

    // assert — Bodyweight does not make it require equipment
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });
});
