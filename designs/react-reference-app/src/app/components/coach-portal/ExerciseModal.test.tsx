import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseModal } from './ExerciseModal';
import { TrainingProvider, useTraining } from '../../context/TrainingContext';

const SQUAT_ID = 'e1';

/** Reads the saved exercise back out of context, so the tests assert persistence. */
function SavedTagsProbe() {
  const { exercises } = useTraining();
  const squat = exercises.find(exercise => exercise.id === SQUAT_ID);
  return <p data-testid="saved-tags">{(squat?.tags ?? []).join(',')}</p>;
}

function renderModal(exerciseId: string | null) {
  return render(
    <TrainingProvider>
      <SavedTagsProbe />
      <ExerciseModal isOpen onClose={() => {}} exerciseId={exerciseId} />
    </TrainingProvider>
  );
}

const fileNamed = (name: string, type: string) => new File(['x'], name, { type });

const dropzone = () => screen.getByText('Drag and drop video').closest('div') as HTMLElement;

beforeAll(() => {
  // jsdom implements neither, and the modal previews the picked file through both.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the exercise tags selector', () => {
  it('shows the three goal tags a coach can assign', () => {
    // arrange & act
    renderModal(null);

    // assert
    expect(screen.getByRole('button', { name: 'Strength' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hypertrophy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recovery' })).toBeInTheDocument();
  });

  it('pre-selects the tags the edited exercise already carries', () => {
    // arrange & act
    renderModal(SQUAT_ID);

    // assert
    expect(screen.getByRole('button', { name: 'Strength' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hypertrophy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Recovery' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists a newly added tag on save', async () => {
    // arrange
    const user = userEvent.setup();
    renderModal(SQUAT_ID);
    expect(screen.getByTestId('saved-tags')).toHaveTextContent('Strength,Hypertrophy');

    // act
    await user.click(screen.getByRole('button', { name: 'Recovery' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert
    expect(screen.getByTestId('saved-tags')).toHaveTextContent('Strength,Hypertrophy,Recovery');
  });

  it('keeps the untouched tags of an edited exercise instead of clearing them', async () => {
    // arrange
    const user = userEvent.setup();
    renderModal(SQUAT_ID);

    // act
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert
    expect(screen.getByTestId('saved-tags')).toHaveTextContent('Strength,Hypertrophy');
  });
});

describe('the demonstration video upload', () => {
  it('offers .mp4 to the file picker', () => {
    // arrange & act
    const { container } = renderModal(null);

    // assert
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', '.mp4,video/mp4');
  });

  it('tells the coach the library takes MP4 only', () => {
    // arrange & act
    renderModal(null);

    // assert
    expect(screen.getByText('MP4 up to 50MB')).toBeInTheDocument();
  });

  it('accepts an .mp4 chosen through the browse button', async () => {
    // arrange
    const user = userEvent.setup();
    const { container } = renderModal(null);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // act
    await user.upload(input, fileNamed('squat-demo.mp4', 'video/mp4'));

    // assert
    expect(screen.queryByText('Drag and drop video')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects a dropped .mov with a visible error and attaches nothing', () => {
    // arrange
    renderModal(null);

    // act — drag-and-drop is not a userEvent interaction, and it bypasses `accept`
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('Only .mp4 videos are supported');
    expect(screen.getByText('Drag and drop video')).toBeInTheDocument();
  });

  it('clears the error once a valid .mp4 is dropped', () => {
    // arrange
    renderModal(null);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // act
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mp4', 'video/mp4')] },
    });

    // assert
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Drag and drop video')).not.toBeInTheDocument();
  });
});
