import { act, render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type InitialEntry } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseEditorPage } from './ExerciseEditorPage';
import { VIDEO_ACCEPT, VIDEO_MAX_BYTES } from '../../utils/exerciseVideo';
import { AppProvider } from '../../context/AppContext';
import { ClientProfileProvider } from '../../context/ClientProfileContext';
import { TrainingProvider, useTraining } from '../../context/TrainingContext';
import { LANDSCAPE_DEMO_CLIP, PORTRAIT_DEMO_CLIP } from '../../services/exerciseSamples';
import type { ExerciseVideoUpload } from '../../services/exerciseVideoService';

const SQUAT_ID = 'e1';
const SPLIT_SQUAT_ID = 'e3';
const ROMANIAN_DEADLIFT_ID = 'e2';
const SERVICE_TIMEOUT = { timeout: 4000 };
const VIDEO_PROMPT = 'Drop a video here or choose one';
const UPLOAD_FAILED = 'The upload didn’t go through. Your entries are still here.';
const ARCHIVED_SMITH_SQUAT_ID = 'e13';

function SavedExerciseProbe({ name }: { name: string }) {
  const { exercises } = useTraining();
  const saved = exercises.find((exercise) => exercise.name === name);
  return (
    <p data-testid="saved">
      {saved
        ? [saved.type, saved.measuredIn, saved.perSide ? 'per-side' : 'both-sides', saved.primaryMuscles.join('+'), saved.secondaryMuscles.join('+'), saved.equipment.join('+'), saved.tags.join('+'), saved.videoUrl ?? 'no-video', saved.difficulty, saved.archivedAt ? 'archived' : 'active'].join('|')
        : 'none'}
    </p>
  );
}

function LibraryStandIn() {
  const { search } = useLocation();
  return (
    <>
      <p>Exercise library</p>
      <p data-testid="library-search">{search}</p>
    </>
  );
}

function renderEditor(entry: InitialEntry, probeName = 'Back squat') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AppProvider>
        <ClientProfileProvider>
          <TrainingProvider>
            <SavedExerciseProbe name={probeName} />
            <Routes>
              <Route path="/coach/training" element={<LibraryStandIn />} />
              <Route path="/coach/training/exercises/new" element={<ExerciseEditorPage />} />
              <Route path="/coach/training/exercises/:exerciseId" element={<ExerciseEditorPage />} />
            </Routes>
            <Toaster />
          </TrainingProvider>
        </ClientProfileProvider>
      </AppProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const NEW = '/coach/training/exercises/new';
const edit = (id: string) => `/coach/training/exercises/${id}`;
const fileNamed = (name: string, type: string) => new File(['x'], name, { type });
const field = (name: string | RegExp) => screen.getByRole('combobox', { name });
const nameField = () => screen.getByRole('textbox', { name: 'Name (required)' });
const multi = (name: string | RegExp) => screen.getByRole('button', { name });
const primary = () => screen.getByRole('button', { name: /^(Create exercise|Save changes)$/ });
const dropzone = () => screen.getByText(VIDEO_PROMPT).closest('label') as HTMLElement;
const drop = (file: File) => fireEvent.drop(dropzone(), { dataTransfer: { files: [file] } });

async function choose(user: ReturnType<typeof userEvent.setup>, combobox: HTMLElement, option: string | RegExp) {
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name: option }));
}

async function tick(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, option: string) {
  await user.click(trigger);
  await user.click(screen.getByRole('checkbox', { name: option }));
  await user.keyboard('{Escape}');
}

const preview = () => screen.getByLabelText('Demo video preview');
const replaceInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

function answerVideoUploads(outcome: ExerciseVideoUpload) {
  window.history.replaceState({}, '', `/?exupload=${outcome}`);
}

beforeAll(() => {
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('a new exercise', () => {
  it('is a page titled New exercise with a way back, Resistance measured in reps and a disabled Create', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'New exercise' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to exercises' })).toHaveAttribute('href', '/coach/training');
    expect(field('Type')).toHaveTextContent('Resistance');
    expect(field('Measured in')).toHaveTextContent('Reps');
    expect(screen.getByRole('radio', { name: 'Both sides together' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'One side at a time' })).not.toBeChecked();
    expect(primary()).toHaveTextContent('Create exercise');
    expect(primary()).toBeDisabled();
  });

  it('lays the fields out in the agreed order', () => {
    // arrange & act
    renderEditor(NEW);
    const titles = screen.getAllByText(/^(Name|Type|Measured in|Sides|Primary muscles|Secondary muscles|Equipment|Difficulty|Tags|Form cues|Demo video)$/, { selector: 'label, p' });

    // assert
    expect(titles.map((title) => title.textContent)).toEqual([
      'Name* (required)', 'Type', 'Measured in', 'Sides', 'Primary muscles* (required)', 'Secondary muscles', 'Equipment', 'Difficulty', 'Tags', 'Form cues', 'Demo video',
    ]);
  });

  it('stars the mandatory fields and names them as required', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(nameField()).toBeInTheDocument();
    expect(screen.getByText('Primary muscles', { selector: 'label' })).toHaveTextContent('Primary muscles* (required)');
    expect(screen.getAllByText('*')).toHaveLength(2);
    expect(multi('Primary muscles (required)')).toBeInTheDocument();
  });

  it('drops the star from Primary muscles for cardio', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await choose(user, field('Type'), 'Cardio');

    // assert
    expect(screen.getByText('Primary muscles', { selector: 'label' })).toHaveTextContent(/^Primary muscles$/);
    expect(screen.getAllByText('*')).toHaveLength(1);
    expect(multi('Primary muscles')).toBeInTheDocument();
  });

  it('names the Sides, Tags and Demo video groups', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(screen.getByRole('radiogroup', { name: 'Sides' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Demo video' })).toBeInTheDocument();
  });

  it('shows no problem before the coach changes anything', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(screen.queryByText('Give the exercise a name')).not.toBeInTheDocument();
    expect(screen.queryByText('Pick at least one primary muscle')).not.toBeInTheDocument();
    expect(nameField()).not.toHaveAttribute('aria-invalid');
  });

  it('says why Create is disabled once a typed name is cleared', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Cossack squat');

    // act
    await user.clear(nameField());

    // assert
    expect(screen.getByText('Give the exercise a name')).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(primary()).toBeDisabled();
  });

  it('offers Cancel as a way back to the library', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/coach/training');
  });

  it('returns to the filtered library it was opened from', async () => {
    // arrange
    const user = renderEditor({ pathname: NEW, state: { library: '?type=cardio' } }, 'Rowing intervals');

    // act
    await user.type(nameField(), 'Rowing intervals');
    await choose(user, field('Type'), 'Cardio');
    const cancel = screen.getByRole('link', { name: 'Cancel' });
    await user.click(primary());

    // assert
    expect(cancel).toHaveAttribute('href', '/coach/training?type=cardio');
    expect(screen.getByText('Exercise library')).toBeInTheDocument();
    expect(screen.getByTestId('library-search')).toHaveTextContent('?type=cardio');
  });

  it('switches the unit to time when the type becomes cardio', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await choose(user, field('Type'), 'Cardio');

    // assert
    expect(field('Measured in')).toHaveTextContent('Time');
  });

  it('keeps a unit the coach chose by hand when the type changes afterwards', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await choose(user, field('Measured in'), /^Distance/);
    await choose(user, field('Type'), 'Cardio');

    // assert
    expect(field('Measured in')).toHaveTextContent('Distance');
  });

  it('resets a hand-picked unit the new type does not allow to the new default', async () => {
    // arrange
    const user = renderEditor(NEW);
    await choose(user, field('Measured in'), /^Distance/);
    await choose(user, field('Type'), 'Cardio');

    // act
    await choose(user, field('Type'), 'Stretching');

    // assert
    expect(field('Measured in')).toHaveTextContent('Time');
  });

  it('offers Breaths and Time, and defaults to Breaths, for a breathing exercise', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await choose(user, field('Type'), 'Breathing');
    const unit = field('Measured in');
    await user.click(unit);

    // assert
    expect(unit).toHaveTextContent('Breaths');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Breaths e.g. 10 breaths',
      'Time e.g. 45 s hold',
    ]);
  });

  it('gives each unit an example', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.click(field('Measured in'));

    // assert
    expect(screen.getByRole('option', { name: 'Reps e.g. 3 × 10' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Time e.g. 45 s hold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Distance e.g. 400 m' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Breaths/ })).not.toBeInTheDocument();
  });

  it('shows only the chosen unit, without its example', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await choose(user, field('Measured in'), /^Time/);

    // assert
    expect(field('Measured in')).toHaveTextContent(/^Time$/);
  });

  it('saves a cardio exercise without muscles and returns to the library', async () => {
    // arrange
    const user = renderEditor(NEW, 'Rowing intervals');

    // act
    await user.type(nameField(), 'Rowing intervals');
    await choose(user, field('Type'), 'Cardio');
    await tick(user, multi('Equipment'), 'Rower');
    await user.click(primary());

    // assert
    expect(screen.getByTestId('saved')).toHaveTextContent('cardio|time|both-sides|||Rower||no-video');
    expect(screen.getByText('Exercise library')).toBeInTheDocument();
  });

  it('will not create a resistance exercise without a primary muscle, and says so', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.type(nameField(), 'Cossack squat');

    // assert
    expect(primary()).toBeDisabled();
    expect(screen.getByText('Pick at least one primary muscle')).toBeInTheDocument();
    expect(multi('Primary muscles (required)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('refuses a name an archived exercise already uses', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.type(nameField(), 'smith machine squat');

    // assert
    expect(screen.getByText('An exercise with this name already exists')).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(primary()).toBeDisabled();
  });

  it('says why Create is disabled when the name is longer than 80 characters', async () => {
    // arrange
    const user = renderEditor(NEW);
    await tick(user, multi('Primary muscles (required)'), 'Glutes');

    // act
    await user.click(nameField());
    await user.paste('a'.repeat(81));

    // assert
    const problem = screen.getByText('Keep the name to 80 characters');
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField()).toHaveAttribute('aria-describedby', problem.id);
    expect(primary()).toBeDisabled();
  });

  it('says why Create is disabled when the form cues are longer than 1,000 characters', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Cossack squat');
    await tick(user, multi('Primary muscles (required)'), 'Glutes');
    expect(primary()).toBeEnabled();

    // act
    await user.click(screen.getByLabelText('Form cues'));
    await user.paste('a'.repeat(1001));

    // assert
    const problem = screen.getByText('Keep the form cues to 1,000 characters');
    expect(screen.getByLabelText('Form cues')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Form cues')).toHaveAttribute('aria-describedby', problem.id);
    expect(primary()).toBeDisabled();
  });

  it('enables Create again once the form cues are back within 1,000 characters', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Cossack squat');
    await tick(user, multi('Primary muscles (required)'), 'Glutes');
    await user.click(screen.getByLabelText('Form cues'));
    await user.paste('a'.repeat(1001));

    // act
    await user.type(screen.getByLabelText('Form cues'), '{Backspace}');

    // assert
    expect(screen.queryByText('Keep the form cues to 1,000 characters')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Form cues')).not.toHaveAttribute('aria-invalid');
    expect(primary()).toBeEnabled();
  });

  it('shows no form cues problem before the coach changes anything', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(screen.getByLabelText('Form cues')).not.toHaveAttribute('aria-invalid');
  });

  it('moves a muscle out of secondary when it becomes primary', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await tick(user, multi('Secondary muscles'), 'Core');
    await tick(user, multi('Primary muscles (required)'), 'Core');

    // assert
    expect(multi(/^Secondary muscles$/)).toBeInTheDocument();
    expect(multi(/^Primary muscles \(required\), 1 selected$/)).toHaveTextContent('Core');
  });

  it('creates a per-side resistance exercise with the chosen muscles, equipment and tags', async () => {
    // arrange
    const user = renderEditor(NEW, 'Cossack squat');

    // act
    await user.type(nameField(), 'Cossack squat');
    await user.click(screen.getByRole('radio', { name: 'One side at a time' }));
    await tick(user, multi('Primary muscles (required)'), 'Adductors');
    await tick(user, multi(/^Primary muscles \(required\)/), 'Glutes');
    await tick(user, multi('Secondary muscles'), 'Core');
    await tick(user, multi('Equipment'), 'Kettlebell');
    await user.click(screen.getByRole('checkbox', { name: 'Hypertrophy' }));
    await user.click(primary());

    // assert
    expect(screen.getByTestId('saved')).toHaveTextContent('resistance|reps|per-side|Adductors+Glutes|Core|Kettlebell|Hypertrophy|no-video');
  });
});

describe('editing an exercise', () => {
  it('opens titled Edit exercise with every stored value shown', () => {
    // arrange & act
    renderEditor(edit(SPLIT_SQUAT_ID));

    // assert
    expect(screen.getByRole('heading', { level: 1, name: 'Edit exercise' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('Bulgarian Split Squat');
    expect(screen.getByRole('radio', { name: 'One side at a time' })).toBeChecked();
    expect(within(multi(/^Primary muscles \(required\), 2 selected$/)).getAllByText(/./).map((pill) => pill.textContent)).toEqual(['Quadriceps', 'Glutes']);
    expect(within(multi(/^Equipment, 2 selected$/)).getAllByText(/./).map((pill) => pill.textContent)).toEqual(['Dumbbells', 'Bench']);
    expect(screen.getByRole('checkbox', { name: 'Hypertrophy' })).toBeChecked();
    expect(primary()).toHaveTextContent('Save changes');
    expect(primary()).toBeEnabled();
  });

  it('lets an exercise keep its own name', () => {
    // arrange & act
    renderEditor(edit(SQUAT_ID));

    // assert
    expect(screen.queryByText('An exercise with this name already exists')).not.toBeInTheDocument();
  });

  it('persists a changed difficulty and a removed tag', async () => {
    // arrange
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');

    // act
    await choose(user, field('Difficulty'), 'Advanced');
    await user.click(screen.getByRole('checkbox', { name: 'Hypertrophy' }));
    await user.click(primary());

    // assert
    expect(screen.getByTestId('saved')).toHaveTextContent(`resistance|reps|both-sides|Quadriceps+Glutes|Core+Hamstrings|Barbell+Squat rack|Strength|${LANDSCAPE_DEMO_CLIP}`);
  });

  it('refuses, for an archived exercise, a name an active exercise already uses', async () => {
    // arrange
    const user = renderEditor(edit(ARCHIVED_SMITH_SQUAT_ID));

    // act
    await user.clear(nameField());
    await user.type(nameField(), 'Plank');

    // assert
    expect(screen.getByText('An exercise with this name already exists')).toBeInTheDocument();
    expect(primary()).toBeDisabled();
  });

  it('keeps an archived exercise archived when only its difficulty changes', async () => {
    // arrange
    const user = renderEditor(edit(ARCHIVED_SMITH_SQUAT_ID), 'Smith Machine Squat');

    // act
    await choose(user, field('Difficulty'), 'Intermediate');
    await user.click(primary());

    // assert
    expect(screen.getByTestId('saved')).toHaveTextContent('|Intermediate|archived');
  });

  it('sends an unknown id back to the library', () => {
    // arrange & act
    renderEditor(edit('nope'));

    // assert
    expect(screen.getByText('Exercise library')).toBeInTheDocument();
  });
});

describe('the demo video', () => {
  it('offers .mp4 and .mov to the file picker and says what to upload', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', VIDEO_ACCEPT);
    expect(screen.getByText('MP4 or MOV up to 50 MB, in a format that plays well on a phone.')).toBeInTheDocument();
  });

  it('offers the whole drop zone as the picker, named by its prompt and described by the guidance', () => {
    // arrange & act
    renderEditor(NEW);

    // assert
    const picker = screen.getByLabelText(VIDEO_PROMPT);
    expect(picker).toHaveAttribute('type', 'file');
    expect(picker).toHaveAccessibleDescription('MP4 or MOV up to 50 MB, in a format that plays well on a phone.');
  });

  it('rejects a dropped .avi with a visible error tied to the control', () => {
    // arrange
    renderEditor(NEW);

    // act
    drop(fileNamed('clip.avi', 'video/x-msvideo'));

    // assert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('clip.avi is not an .mp4 or .mov');
    const picker = screen.getByLabelText(VIDEO_PROMPT);
    expect(picker).toHaveAttribute('aria-invalid', 'true');
    expect(picker.getAttribute('aria-describedby')?.split(' ')).toContain(alert.id);
  });

  it('refuses an .mp4 over 50 MB and attaches nothing', () => {
    // arrange
    renderEditor(NEW);
    const oversize = fileNamed('clip.mp4', 'video/mp4');
    Object.defineProperty(oversize, 'size', { value: VIDEO_MAX_BYTES + 1 });

    // act
    drop(oversize);

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('clip.mp4 is larger than 50 MB');
    expect(screen.getByText(VIDEO_PROMPT)).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('announces a rejected file once, through the alert and not a toast as well', async () => {
    // arrange
    renderEditor(NEW);

    // act
    drop(fileNamed('clip.avi', 'video/x-msvideo'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    // assert
    expect(screen.getAllByText(/clip\.avi is not an \.mp4 or \.mov/)).toHaveLength(1);
  });

  it.each([
    ['an .mp4', 'squat.mp4', 'video/mp4'],
    ['a .mov', 'squat.mov', 'video/quicktime'],
  ])('uploads %s chosen through Replace on save and keeps the stored video', async (_kind, name, type) => {
    // arrange
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');

    // act
    await user.upload(replaceInput(), fileNamed(name, type));
    await user.click(primary());

    // assert
    expect(await screen.findByText('Exercise library', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent(`blob:${name}`);
  });

  it('clears the stored video when the coach removes it and saves', async () => {
    // arrange
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');

    // act
    await user.click(screen.getByRole('button', { name: 'Remove video' }));
    await user.click(primary());

    // assert
    expect(screen.getByTestId('saved')).toHaveTextContent('no-video');
  });

  it('names each rejected file, so a second rejection is announced too', () => {
    // arrange
    renderEditor(NEW);
    drop(fileNamed('squat-demo.avi', 'video/x-msvideo'));
    const first = screen.getByRole('alert').textContent;

    // act
    drop(fileNamed('deadlift-demo.avi', 'video/x-msvideo'));

    // assert
    expect(screen.getByRole('alert').textContent).not.toBe(first);
    expect(screen.getByRole('alert')).toHaveTextContent('deadlift-demo.avi');
  });

  it('clears the error once a valid .mp4 is dropped', () => {
    // arrange
    renderEditor(NEW);
    drop(fileNamed('squat-demo.avi', 'video/x-msvideo'));

    // act
    drop(fileNamed('squat-demo.mp4', 'video/mp4'));

    // assert
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.queryByText(VIDEO_PROMPT)).not.toBeInTheDocument();
  });

  it.each([
    ['a landscape', SQUAT_ID, LANDSCAPE_DEMO_CLIP],
    ['a portrait', ROMANIAN_DEADLIFT_ID, PORTRAIT_DEMO_CLIP],
  ])('plays %s stored video with the player controls, ready to seek', (_shape, id, clip) => {
    // arrange & act
    renderEditor(edit(id));

    // assert
    expect(preview()).toHaveAttribute('src', clip);
    expect(preview()).toHaveAttribute('controls');
    expect(preview()).toHaveAttribute('preload', 'metadata');
  });

  it('keeps Replace and Remove outside the video frame, clear of the player controls', () => {
    // arrange & act
    renderEditor(edit(SQUAT_ID));

    // assert
    const frame = preview().parentElement as HTMLElement;
    expect(frame).not.toContainElement(screen.getByRole('button', { name: 'Replace video' }));
    expect(frame).not.toContainElement(screen.getByRole('button', { name: 'Remove video' }));
  });

  it('previews a chosen file at once, with controls', async () => {
    // arrange
    const user = renderEditor(NEW);

    // act
    await user.upload(screen.getByLabelText(VIDEO_PROMPT), fileNamed('cossack.mp4', 'video/mp4'));

    // assert
    expect(preview()).toHaveAttribute('src', 'blob:cossack.mp4');
    expect(preview()).toHaveAttribute('controls');
    expect(screen.getByRole('button', { name: 'Replace video' })).toBeEnabled();
  });

  it('keeps the current video when a replacement is refused', () => {
    // arrange
    renderEditor(edit(SQUAT_ID));

    // act
    fireEvent.change(replaceInput(), { target: { files: [fileNamed('squat.avi', 'video/x-msvideo')] } });

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('squat.avi is not an .mp4 or .mov');
    expect(preview()).toHaveAttribute('src', LANDSCAPE_DEMO_CLIP);
    expect(screen.getByRole('button', { name: 'Replace video' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Replace video' })).toHaveAccessibleDescription('squat.avi is not an .mp4 or .mov — only .mp4 and .mov videos are supported');
  });

  it('keeps a chosen file when an oversized replacement is refused', async () => {
    // arrange
    const user = renderEditor(NEW);
    await user.upload(screen.getByLabelText(VIDEO_PROMPT), fileNamed('cossack.mp4', 'video/mp4'));
    const oversize = fileNamed('cossack-long.mp4', 'video/mp4');
    Object.defineProperty(oversize, 'size', { value: VIDEO_MAX_BYTES + 1 });

    // act
    fireEvent.change(replaceInput(), { target: { files: [oversize] } });

    // assert
    expect(screen.getByRole('alert')).toHaveTextContent('cossack-long.mp4 is larger than 50 MB');
    expect(preview()).toHaveAttribute('src', 'blob:cossack.mp4');
  });
});

describe('saving with a newly chosen video', () => {
  it('shows the upload progress politely and locks the video actions and Save', async () => {
    // arrange
    answerVideoUploads('holds-uploading');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    expect(await screen.findByText('Uploading video… 40%', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Uploading video… 40%');
    expect(screen.getByRole('progressbar', { name: 'Video upload' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByRole('button', { name: 'Replace video' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove video' })).toBeDisabled();
    expect(screen.getByTestId('saved')).toHaveTextContent(LANDSCAPE_DEMO_CLIP);
  });

  it('turns Save changes into a busy Saving… with no done mark while the video uploads', async () => {
    // arrange
    answerVideoUploads('holds-uploading');
    const user = renderEditor(edit(SQUAT_ID));
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute('aria-busy', 'true');
    expect(saving.querySelector('svg')).toBeNull();
  });

  it('turns Create exercise into a busy Saving… with no done mark while the video uploads', async () => {
    // arrange
    answerVideoUploads('holds-uploading');
    const user = renderEditor(NEW);
    await user.type(nameField(), 'Cossack squat');
    await tick(user, multi('Primary muscles (required)'), 'Adductors');
    await user.upload(screen.getByLabelText(VIDEO_PROMPT), fileNamed('cossack.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute('aria-busy', 'true');
    expect(saving.querySelector('svg')).toBeNull();
  });

  it('shows the server refusing the file as not a video at the field, keeping the file and every entry', async () => {
    // arrange
    answerVideoUploads('refused');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await choose(user, field('Difficulty'), 'Advanced');
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    const message = 'squat.mp4 is not an .mp4 or .mov — only .mp4 and .mov videos are supported';
    expect(await screen.findByText(message, {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Replace video' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Replace video' })).toHaveAccessibleDescription(message);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByText(UPLOAD_FAILED)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(preview()).toHaveAttribute('src', 'blob:squat.mp4');
    expect(field('Difficulty')).toHaveTextContent('Advanced');
    expect(primary()).toBeEnabled();
    expect(screen.getByTestId('saved')).toHaveTextContent(`${LANDSCAPE_DEMO_CLIP}|Intermediate`);
  });

  it('says it is finishing up once every byte is sent and the server is storing it', async () => {
    // arrange
    answerVideoUploads('holds-finishing');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    expect(await screen.findByText('Finishing up…', {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Finishing up…');
    expect(screen.getByRole('progressbar', { name: 'Video upload' })).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace video' })).toBeDisabled();
    expect(screen.getByTestId('saved')).toHaveTextContent(LANDSCAPE_DEMO_CLIP);
  });

  it('keeps every entry and the chosen file when the upload fails, and offers Try again', async () => {
    // arrange
    answerVideoUploads('fails');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await choose(user, field('Difficulty'), 'Advanced');
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));

    // act
    await user.click(primary());

    // assert
    await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT);
    const alert = screen.getAllByRole('alert').find((candidate) => candidate.textContent?.includes(UPLOAD_FAILED));
    expect(alert).toBeDefined();
    expect(within(alert as HTMLElement).getByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(within(screen.getByRole('group', { name: 'Demo video' })).getByText(UPLOAD_FAILED)).toBeInTheDocument();
    expect(nameField()).toHaveValue('Barbell Back Squat');
    expect(field('Difficulty')).toHaveTextContent('Advanced');
    expect(preview()).toHaveAttribute('src', 'blob:squat.mp4');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(primary()).toBeEnabled();
    expect(screen.getByTestId('saved')).toHaveTextContent('Intermediate');
  });

  it('saves again from Try again, keeping the entries', async () => {
    // arrange
    answerVideoUploads('fails');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await choose(user, field('Difficulty'), 'Advanced');
    await user.upload(replaceInput(), fileNamed('squat.mp4', 'video/mp4'));
    await user.click(primary());
    await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT);

    // act
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    // assert
    expect(screen.queryByText(UPLOAD_FAILED)).not.toBeInTheDocument();
    expect(await screen.findByText(/^Uploading video… \d+%$/)).toBeInTheDocument();
    expect(await screen.findByText(UPLOAD_FAILED, {}, SERVICE_TIMEOUT)).toBeInTheDocument();
    expect(field('Difficulty')).toHaveTextContent('Advanced');
    expect(preview()).toHaveAttribute('src', 'blob:squat.mp4');
  });

  it('stays a plain save, with no upload progress, when no new file was chosen', async () => {
    // arrange
    answerVideoUploads('holds-uploading');
    const user = renderEditor(edit(SQUAT_ID), 'Barbell Back Squat');
    await choose(user, field('Difficulty'), 'Advanced');

    // act
    await user.click(primary());

    // assert
    expect(screen.getByText('Exercise library')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('saved')).toHaveTextContent(`${LANDSCAPE_DEMO_CLIP}|Advanced`);
  });
});

const THUMBED_ID = 'thumbed';

function ThumbnailedExerciseSeeder() {
  const navigate = useNavigate();
  const { exercises, addExercise } = useTraining();
  const thumbed = exercises.find((exercise) => exercise.id === THUMBED_ID);
  const seed = () => {
    addExercise({
      id: THUMBED_ID,
      name: 'Thumbed exercise',
      cues: '',
      type: 'cardio',
      measuredIn: 'time',
      perSide: false,
      equipment: [],
      difficulty: 'Beginner',
      primaryMuscles: [],
      secondaryMuscles: [],
      tags: ['Recovery'],
      thumbnailUrl: 'thumb.png',
    });
    navigate(edit(THUMBED_ID));
  };
  return (
    <>
      <p data-testid="thumbnail">{thumbed?.thumbnailUrl ?? 'none'}</p>
      <button type="button" onClick={seed}>Seed a thumbnailed exercise</button>
    </>
  );
}

describe('saving an exercise the editor only partly covers', () => {
  it('keeps a thumbnail the editor does not edit', async () => {
    // arrange
    render(
      <MemoryRouter initialEntries={['/coach/training']}>
        <AppProvider>
          <ClientProfileProvider>
            <TrainingProvider>
              <ThumbnailedExerciseSeeder />
              <Routes>
                <Route path="/coach/training" element={<p>Exercise library</p>} />
                <Route path="/coach/training/exercises/:exerciseId" element={<ExerciseEditorPage />} />
              </Routes>
            </TrainingProvider>
          </ClientProfileProvider>
        </AppProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Seed a thumbnailed exercise' }));

    // act
    await user.click(primary());

    // assert
    expect(screen.getByText('Exercise library')).toBeInTheDocument();
    expect(screen.getByTestId('thumbnail')).toHaveTextContent('thumb.png');
  });
});
