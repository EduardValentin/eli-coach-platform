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

const chip = (name: string) => screen.getByRole('button', { name });

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
    await user.click(chip('Recovery'));

    // assert — only the two Recovery-tagged exercises survive
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('widens the table when a second tag is selected, rather than intersecting', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(chip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(chip('Strength'));

    // assert — Strength-only exercises join the Recovery-tagged ones
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('narrows to equipment-free exercises under the No Equipment chip', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(chip('No Equipment'));

    // assert
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();
  });

  it('intersects the goal and equipment groups', async () => {
    // arrange
    const user = await renderLibrary();

    // act
    await user.click(chip('Recovery'));
    await user.click(chip('Equipment'));

    // assert — Romanian Deadlift is Recovery-tagged and uses a barbell; Plank is not
    expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
  });

  it('combines the filters with the existing search', async () => {
    // arrange
    const user = await renderLibrary();

    // act — every match for "squat" is Strength- or Hypertrophy-tagged, so the
    // tag group is the only thing that can exclude one
    await user.click(chip('Recovery'));
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
    await user.click(chip('Strength'));
    await user.click(chip('No Equipment'));

    // assert
    expect(screen.getByText(/No exercises match/)).toBeInTheDocument();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
  });

  it('restores the full library through the clear action', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(chip('Recovery'));
    expect(screen.queryByText('Barbell Back Squat')).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    // assert
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });

  it('keeps the clear action focusable while it works, rather than unmounting it', async () => {
    // arrange
    const user = await renderLibrary();
    await user.click(chip('Recovery'));
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    clear.focus();

    // act
    await user.keyboard('{Enter}');

    // assert — focus stays on the control instead of falling back to the body
    expect(document.activeElement).toBe(clear);
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
  });

  it('shows each exercise its tags so the coach can see why a row matched', async () => {
    // arrange
    await renderLibrary();

    // act
    const plankRow = screen.getByText('Plank').closest('tr') as HTMLElement;

    // assert
    expect(within(plankRow).getByText('Recovery')).toBeInTheDocument();
  });
});
