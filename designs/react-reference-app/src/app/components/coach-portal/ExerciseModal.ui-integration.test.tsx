import { useState } from 'react';
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

/** Reads back an exercise created during the test, by name. */
function NewExerciseTagsProbe() {
  const { exercises } = useTraining();
  const created = exercises.find(exercise => exercise.name === 'Cossack Squat');
  return (
    <p data-testid="new-tags">
      {created ? `${created.name}:${(created.tags ?? []).join(',')}` : 'none'}
    </p>
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

describe('creating an exercise', () => {
  it('persists the tags picked on a brand-new exercise', async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <TrainingProvider>
        <NewExerciseTagsProbe />
        <ExerciseModal isOpen onClose={() => {}} exerciseId={null} />
      </TrainingProvider>
    );

    // act
    await user.type(screen.getByPlaceholderText('e.g. Barbell Back Squat'), 'Cossack Squat');
    await user.click(screen.getByRole('button', { name: 'Recovery' }));
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }));

    // assert
    expect(screen.getByTestId('new-tags')).toHaveTextContent('Cossack Squat:Recovery');
  });

  it('starts a new exercise with no tags selected', () => {
    // arrange & act
    renderModal(null);

    // assert
    expect(screen.getByRole('button', { name: 'Strength' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Hypertrophy' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Recovery' })).toHaveAttribute('aria-pressed', 'false');
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

  it('accepts an .mp4 chosen through the file picker', async () => {
    // arrange
    const user = userEvent.setup();
    const { container } = renderModal(null);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // act
    await user.upload(input, fileNamed('squat-demo.mp4', 'video/mp4'));

    // assert
    expect(screen.queryByText('Drag and drop video')).not.toBeInTheDocument();
  });

  it('rejects a dropped .mov with a visible error and attaches nothing', () => {
    // arrange
    renderModal(null);

    // act — drag-and-drop is not a userEvent interaction, and it bypasses `accept`
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('squat-demo.mov is not an .mp4');
    expect(screen.getByText('Drag and drop video')).toBeInTheDocument();
  });

  it('names each rejected file, so a second rejection is announced too', () => {
    // arrange
    renderModal(null);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });
    const first = screen.getByRole('alert').textContent;

    // act
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('deadlift-demo.mov', 'video/quicktime')] },
    });

    // assert
    expect(screen.getByRole('alert').textContent).not.toBe(first);
    expect(screen.getByRole('alert')).toHaveTextContent('deadlift-demo.mov');
  });

  it('ties the error to the file input for assistive technology', () => {
    // arrange
    const { container } = renderModal(null);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // act
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });

    // assert
    expect(input).toHaveAttribute('aria-describedby', 'exercise-video-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the error once a valid .mp4 is dropped', () => {
    // arrange
    renderModal(null);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mov', 'video/quicktime')] },
    });
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement();

    // act
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [fileNamed('squat-demo.mp4', 'video/mp4')] },
    });

    // assert
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.queryByText('Drag and drop video')).not.toBeInTheDocument();
  });
});


/**
 * Mirrors how TrainingHub mounts the modal once and re-points it at different
 * exercises, which is what lets state leak from one exercise to the next.
 */
function ReusedModalHarness() {
  const { exercises, addExercise } = useTraining();
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const plank = exercises.find(exercise => exercise.id === 'e12');
  const thumbed = exercises.find(exercise => exercise.id === 'thumb-1');

  return (
    <>
      <p data-testid="plank-video">{plank?.videoUrl ?? 'none'}</p>
      <p data-testid="thumbed-thumbnail">{thumbed?.thumbnailUrl ?? 'none'}</p>
      <button
        onClick={() =>
          addExercise({
            id: 'thumb-1',
            name: 'Thumbed Exercise',
            description: '',
            equipment: [],
            difficulty: 'Beginner',
            primaryMuscles: [],
            secondaryMuscles: [],
            tags: ['Recovery'],
            thumbnailUrl: 'thumb.png',
          })
        }
      >
        harness seed thumbed
      </button>
      <button onClick={() => { setExerciseId('e12'); setIsOpen(true); }}>harness open plank</button>
      <button onClick={() => { setExerciseId('thumb-1'); setIsOpen(true); }}>harness open thumbed</button>
      <ExerciseModal isOpen={isOpen} onClose={() => setIsOpen(false)} exerciseId={exerciseId} />
    </>
  );
}

describe('reusing the modal across exercises', () => {
  it('does not attach a previously picked video to the next exercise edited', async () => {
    // arrange — create an exercise with a video, exactly as a coach would
    const user = userEvent.setup();
    render(
      <TrainingProvider>
        <ReusedModalHarness />
      </TrainingProvider>
    );
    await user.type(screen.getByPlaceholderText('e.g. Barbell Back Squat'), 'Video Carrier');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, fileNamed('carrier.mp4', 'video/mp4'));
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }));

    // act — edit a different exercise that has no video and save it untouched
    await user.click(screen.getByRole('button', { name: 'harness open plank' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert
    expect(screen.getByTestId('plank-video')).toHaveTextContent('none');
  });

  it('keeps a thumbnail the modal does not edit', async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <TrainingProvider>
        <ReusedModalHarness />
      </TrainingProvider>
    );
    await user.click(screen.getByRole('button', { name: 'harness seed thumbed' }));
    expect(screen.getByTestId('thumbed-thumbnail')).toHaveTextContent('thumb.png');

    // act
    await user.click(screen.getByRole('button', { name: 'harness open thumbed' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    // assert
    expect(screen.getByTestId('thumbed-thumbnail')).toHaveTextContent('thumb.png');
  });
});
