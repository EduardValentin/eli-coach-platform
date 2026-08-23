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

const goalChip = (name: string) =>
  within(screen.getByRole('group', { name: 'Goals' })).getByRole('button', { name });

const noEquipmentSwitch = () => screen.getByRole('switch', { name: 'No equipment only' });

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
    await user.click(goalChip('Recovery'));

    // assert — only the two Recovery-tagged exercises survive
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens the table when a second tag is selected, rather than intersecting', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(goalChip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(goalChip('Strength'));

    // assert — Strength-only exercises join the Recovery-tagged ones
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises when the switch is on', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(noEquipmentSwitch());

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('intersects the goal tags with the equipment switch', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(goalChip('Recovery'));
    await user.click(noEquipmentSwitch());

    // assert — both are Recovery-tagged, but Romanian Deadlift needs a barbell
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Romanian Deadlift')).not.toBeInTheDocument();
  });

  it('places no equipment constraint while the switch is off', async () => {
    // arrange & act
    await renderLibrary();

    // assert — both kinds are listed
    expect(noEquipmentSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('combines the filters with the existing search', async () => {
    // arrange
    const user = await renderLibrary();

    // act — every match for "squat" is Strength- or Hypertrophy-tagged, so the
    // tag group is the only thing that can exclude one
    await user.click(goalChip('Recovery'));
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
    await user.click(goalChip('Strength'));
    await user.click(noEquipmentSwitch());

    // assert
    expect(screen.getByText(/No exercises match/)).toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
  });

  it('restores the full library through the clear action', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(goalChip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps the clear action focusable while it works, rather than unmounting it', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(goalChip('Recovery'));
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    clear.focus();

    // act
    await user.keyboard('{Enter}');

    // assert — the control stays mounted, focusable and in the tab order. A real
    // browser blurs an element the moment it becomes `disabled`, which jsdom does
    // not reproduce, so `aria-disabled` is what makes this hold outside jsdom too.
    expect(document.activeElement).toBe(clear);
    expect(clear).toHaveAttribute('aria-disabled', 'true');
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
    const modalTags = screen.getByRole('group', { name: 'Tags' });
    await user.click(within(modalTags).getByRole('button', { name: 'Strength' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert — the visible row, not provider state
    expect(within(plankRow()).getByText('Strength')).toBeInTheDocument();
  });
});
