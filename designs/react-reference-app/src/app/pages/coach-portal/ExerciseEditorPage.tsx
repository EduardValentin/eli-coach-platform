import { useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Check, Dumbbell, Film, Target, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TAG_LABELS,
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  MEASURE_EXAMPLES,
  MEASURE_LABELS,
  MUSCLES,
  defaultMeasureFor,
  draftProblems,
  isValidDraft,
  labelsOf,
  measureAllowedFor,
  measuresFor,
  withPrimaryMuscleToggled,
  type Difficulty,
  type Equipment,
  type ExerciseDraft,
  type ExerciseType,
  type Measure,
  type Muscle,
} from '../../domain/exercises';
import {
  VIDEO_ACCEPT,
  isVideoFile,
  isWithinVideoLimit,
  videoRejectionMessage,
  videoTooLargeMessage,
} from '../../utils/exerciseVideo';
import { toggled } from '../../utils/libraryListing';
import { InlineProblem } from '../../components/InlineProblem';
import { ChoiceGroup, ChoiceOption } from '../../components/ChoiceGroup';
import { MediaOverlayActions } from '../../components/MediaOverlayActions';
import { MultiSelect } from '../../components/MultiSelect';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsRow, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { ToggleChip } from '../../components/ToggleChip';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';

const LIBRARY = '/coach/training';
type LibraryReturn = { library?: unknown } | null;

function libraryPath(state: LibraryReturn): string {
  const search = state?.library;
  return typeof search === 'string' ? `${LIBRARY}${search}` : LIBRARY;
}

const MUSCLE_LABELS = labelsOf(MUSCLES);
const EQUIPMENT_LABELS = labelsOf(EQUIPMENT);
const DIFFICULTY_LABELS = labelsOf(DIFFICULTIES);
const BOTH_SIDES = 'both';
const ONE_SIDE = 'one';
const VIDEO_GUIDANCE = 'MP4 or MOV up to 50 MB, in a format that plays well on a phone.';

type Draft = ExerciseDraft & { measureTouched: boolean };

const EMPTY: Draft = {
  name: '',
  type: 'resistance',
  measuredIn: 'reps',
  measureTouched: false,
  perSide: false,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  difficulty: 'Beginner',
  tags: [],
  cues: '',
};

function draftFrom(exercise: Exercise): Draft {
  return {
    name: exercise.name,
    type: exercise.type,
    measuredIn: exercise.measuredIn,
    measureTouched: exercise.measuredIn !== defaultMeasureFor(exercise.type),
    perSide: exercise.perSide,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    tags: exercise.tags,
    cues: exercise.cues,
  };
}

type VideoState = { file: File | null; preview: string | null; error: string | null };
const NO_VIDEO: VideoState = { file: null, preview: null, error: null };

function videoFrom(exercise: Exercise | undefined): VideoState {
  return exercise?.videoUrl ? { file: null, preview: `mock-url-${exercise.videoUrl}`, error: null } : NO_VIDEO;
}

function VideoField({ video, onChange }: { video: VideoState; onChange: (video: VideoState) => void }) {
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const browse = () => input.current?.click();
  const pickerTrigger = {
    'aria-invalid': video.error ? true : undefined,
    'aria-describedby': errorId,
  };

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!isVideoFile(file)) {
      onChange({ ...video, error: videoRejectionMessage(file) });
      return;
    }
    if (!isWithinVideoLimit(file)) {
      onChange({ ...video, error: videoTooLargeMessage(file) });
      return;
    }
    onChange({ file, preview: URL.createObjectURL(file), error: null });
  };

  return (
    <div className="grid max-w-md gap-2">
      <input
        ref={input}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {video.preview ? (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-surface-inverted">
          <video src={video.preview} className="h-full w-full object-cover opacity-80" />
          <MediaOverlayActions
            subject="video"
            onReplace={browse}
            onRemove={() => onChange(NO_VIDEO)}
            replaceProps={pickerTrigger}
          />
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            take(event.dataTransfer.files[0]);
          }}
          className={cn('rounded-card border-2 border-dashed p-6 text-center transition-colors', {
            'border-primary bg-primary-soft': dragging,
            'border-border bg-surface-quiet': !dragging,
          })}
        >
          <UploadCloud className="mx-auto mb-3 text-primary" size={24} aria-hidden="true" />
          <p className="text-sm font-medium text-text-primary">Drag and drop video</p>
          <p className="mb-4 mt-1 text-xs text-text-secondary">{VIDEO_GUIDANCE}</p>
          <Button type="button" variant="outline" onClick={browse} {...pickerTrigger}>
            Browse files
          </Button>
        </div>
      )}
      <p id={errorId} role="alert" className="text-xs font-medium text-destructive empty:hidden">
        {video.error}
      </p>
    </div>
  );
}

function ExerciseEditor({ editing, library }: { editing: Exercise | undefined; library: string }) {
  const navigate = useNavigate();
  const { exercises, addExercise, updateExercise } = useTraining();
  const [draft, setDraft] = useState<Draft>(editing ? draftFrom(editing) : EMPTY);
  const [video, setVideo] = useState<VideoState>(videoFrom(editing));
  const [touched, setTouched] = useState(false);
  const ids = {
    name: useId(), nameProblem: useId(), type: useId(), measure: useId(),
    sidesLabel: useId(), primary: useId(), primaryProblem: useId(), secondary: useId(), equipment: useId(),
    difficulty: useId(), tagsLabel: useId(), cues: useId(), cuesProblem: useId(), videoLabel: useId(),
  };

  const others = exercises.filter((exercise) => exercise.id !== editing?.id);
  const problems = draftProblems(draft, others);
  const shownProblems: typeof problems = touched ? problems : {};
  const change = (update: (previous: Draft) => Draft) => {
    setTouched(true);
    setDraft(update);
  };
  const changeVideo = (next: VideoState) => {
    setTouched(true);
    setVideo(next);
  };
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    change((previous) => ({ ...previous, [key]: value }));

  const chooseType = (type: ExerciseType) =>
    change((previous) => {
      const keepsUnit = previous.measureTouched && measureAllowedFor(type, previous.measuredIn);
      if (keepsUnit) return { ...previous, type };
      return { ...previous, type, measuredIn: defaultMeasureFor(type), measureTouched: false };
    });
  const chooseMeasure = (measuredIn: Measure) =>
    change((previous) => ({ ...previous, measuredIn, measureTouched: true }));
  const togglePrimary = (muscle: Muscle) =>
    change((previous) => ({ ...previous, ...withPrimaryMuscleToggled(previous, muscle) }));

  const save = () => {
    const record: Exercise = {
      id: editing?.id ?? `e-${Date.now()}`,
      name: draft.name.trim(),
      cues: draft.cues.trim(),
      type: draft.type,
      measuredIn: draft.measuredIn,
      perSide: draft.perSide,
      primaryMuscles: [...draft.primaryMuscles],
      secondaryMuscles: [...draft.secondaryMuscles],
      equipment: [...draft.equipment],
      difficulty: draft.difficulty,
      tags: [...draft.tags],
      videoUrl: video.file ? video.file.name : video.preview ? editing?.videoUrl : undefined,
      thumbnailUrl: editing?.thumbnailUrl,
      archivedAt: editing?.archivedAt,
    };
    if (editing) {
      updateExercise(record);
      toast.success('Exercise updated');
    } else {
      addExercise(record);
      toast.success('Exercise created');
    }
    navigate(library);
  };

  return (
    <div className="w-full max-w-3xl" data-parity-root="ExerciseEditorPage">
      <PortalBackLink to={library}>Back to exercises</PortalBackLink>
      <PortalPageHeader title={editing ? 'Edit exercise' : 'New exercise'} />

      <div className="space-y-6 sm:space-y-8">
        <SettingsSection
          headingId="exercise-about-heading"
          title="About the exercise"
          icon={<Dumbbell aria-hidden="true" className="text-brand-secondary" size={18} />}
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.name}
              title="Name"
              layout="stacked"
              problem={shownProblems.name && <InlineProblem id={ids.nameProblem}>{shownProblems.name}</InlineProblem>}
            >
              <Input
                id={ids.name}
                value={draft.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="e.g. Barbell back squat"
                aria-invalid={shownProblems.name ? true : undefined}
                aria-describedby={shownProblems.name ? ids.nameProblem : undefined}
              />
            </SettingsRow>
            <SettingsRow htmlFor={ids.type} title="Type" layout="stacked">
              <Select value={draft.type} onValueChange={(value) => chooseType(value as ExerciseType)}>
                <SelectTrigger id={ids.type}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{EXERCISE_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow htmlFor={ids.measure} title="Measured in" layout="stacked">
              <Select value={draft.measuredIn} onValueChange={(value) => chooseMeasure(value as Measure)}>
                <SelectTrigger id={ids.measure}>
                  <SelectValue>{MEASURE_LABELS[draft.measuredIn]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {measuresFor(draft.type).map((measure) => (
                    <SelectItem key={measure} value={measure}>
                      {MEASURE_LABELS[measure]}{' '}
                      <span
                        className="text-xs text-text-secondary in-data-[state=checked]:text-current"
                        data-parity="unit-example"
                      >
                        {MEASURE_EXAMPLES[measure]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow labelId={ids.sidesLabel} title="Sides" layout="stacked">
              <ChoiceGroup
                size="md"
                aria-labelledby={ids.sidesLabel}
                value={draft.perSide ? ONE_SIDE : BOTH_SIDES}
                onValueChange={(value) => set('perSide', value === ONE_SIDE)}
              >
                <ChoiceOption value={BOTH_SIDES}>Both sides together</ChoiceOption>
                <ChoiceOption value={ONE_SIDE}>One side at a time</ChoiceOption>
              </ChoiceGroup>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="exercise-work-heading"
          title="What it works"
          icon={<Target aria-hidden="true" className="text-brand-secondary" size={18} />}
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.primary}
              title="Primary muscles"
              layout="stacked"
              problem={
                shownProblems.primaryMuscles && (
                  <InlineProblem id={ids.primaryProblem}>{shownProblems.primaryMuscles}</InlineProblem>
                )
              }
            >
              <MultiSelect
                id={ids.primary}
                label="Primary muscles"
                summary="names"
                size="md"
                placeholder="Pick muscles"
                aria-invalid={shownProblems.primaryMuscles ? true : undefined}
                aria-describedby={shownProblems.primaryMuscles ? ids.primaryProblem : undefined}
                selected={draft.primaryMuscles}
                options={MUSCLES}
                labels={MUSCLE_LABELS}
                onToggle={togglePrimary}
              />
            </SettingsRow>
            <SettingsRow htmlFor={ids.secondary} title="Secondary muscles" layout="stacked">
              <MultiSelect
                id={ids.secondary}
                label="Secondary muscles"
                summary="names"
                size="md"
                placeholder="Pick muscles"
                selected={draft.secondaryMuscles}
                options={MUSCLES.filter((muscle) => !draft.primaryMuscles.includes(muscle))}
                labels={MUSCLE_LABELS}
                onToggle={(muscle) => set('secondaryMuscles', toggled(draft.secondaryMuscles, muscle))}
              />
            </SettingsRow>
            <SettingsRow htmlFor={ids.equipment} title="Equipment" layout="stacked" description="Leave it empty for a bodyweight exercise.">
              <MultiSelect
                id={ids.equipment}
                label="Equipment"
                summary="names"
                size="md"
                placeholder="Pick equipment"
                selected={draft.equipment}
                options={EQUIPMENT}
                labels={EQUIPMENT_LABELS}
                onToggle={(item: Equipment) => set('equipment', toggled(draft.equipment, item))}
              />
            </SettingsRow>
            <SettingsRow htmlFor={ids.difficulty} title="Difficulty" layout="stacked">
              <Select value={draft.difficulty} onValueChange={(value) => set('difficulty', value as Difficulty)}>
                <SelectTrigger id={ids.difficulty}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow as="fieldset" labelId={ids.tagsLabel} title="Tags" layout="stacked">
              <ul className="flex flex-wrap gap-2" data-parity="exercise-tag-chips">
                {EXERCISE_TAGS.map((tag) => (
                  <li key={tag}>
                    <ToggleChip pressed={draft.tags.includes(tag)} onPressedChange={() => set('tags', toggled(draft.tags, tag))}>
                      {EXERCISE_TAG_LABELS[tag]}
                    </ToggleChip>
                  </li>
                ))}
              </ul>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="exercise-coaching-heading"
          title="Coaching"
          icon={<Film aria-hidden="true" className="text-brand-secondary" size={18} />}
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.cues}
              title="Form cues"
              layout="stacked"
              problem={shownProblems.cues && <InlineProblem id={ids.cuesProblem}>{shownProblems.cues}</InlineProblem>}
            >
              <Textarea
                id={ids.cues}
                rows={3}
                value={draft.cues}
                onChange={(event) => set('cues', event.target.value)}
                placeholder="Keep the chest up, drive through the heels…"
                aria-invalid={shownProblems.cues ? true : undefined}
                aria-describedby={shownProblems.cues ? ids.cuesProblem : undefined}
              />
            </SettingsRow>
            <SettingsRow as="fieldset" labelId={ids.videoLabel} title="Demo video" layout="stacked" data-parity="exercise-video-field">
              <VideoField video={video} onChange={changeVideo} />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3" data-parity="exercise-editor-actions">
        <Link to={library} className={buttonVariants({ variant: 'ghost', size: 'md' })}>
          Cancel
        </Link>
        <Button onClick={save} variant="primary" size="md" disabled={!isValidDraft(problems)}>
          <Check size={16} />
          {editing ? 'Save changes' : 'Create exercise'}
        </Button>
      </div>
    </div>
  );
}

export function ExerciseEditorPage() {
  const { exerciseId } = useParams<{ exerciseId?: string }>();
  const { exercises } = useTraining();
  const library = libraryPath(useLocation().state as LibraryReturn);
  const editing = exerciseId ? exercises.find((exercise) => exercise.id === exerciseId) : undefined;
  if (exerciseId && !editing) return <Navigate to={library} replace />;
  return <ExerciseEditor key={editing?.id ?? 'new'} editing={editing} library={library} />;
}
