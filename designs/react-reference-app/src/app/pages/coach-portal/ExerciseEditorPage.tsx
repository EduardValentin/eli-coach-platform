import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Check, Dumbbell, Film, RefreshCw, Target, X } from 'lucide-react';
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
  videoContentRejectionMessage,
  videoRejectionMessage,
  videoTooLargeMessage,
} from '../../utils/exerciseVideo';
import { toggled } from '../../utils/libraryListing';
import { InlineProblem } from '../../components/InlineProblem';
import { ChoiceGroup, ChoiceOption } from '../../components/ChoiceGroup';
import { FileDropzone } from '../../components/FileDropzone';
import { MultiSelect } from '../../components/MultiSelect';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsRow, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { CheckboxChip } from '../../components/CheckboxChip';
import { Alert, AlertAction } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';

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
const VIDEO_PROMPT = 'Drop a video here or choose one';
const UPLOAD_FAILED = 'The upload didn’t go through. Your entries are still here.';

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
  return exercise?.videoUrl ? { file: null, preview: exercise.videoUrl, error: null } : NO_VIDEO;
}

type VideoSaving =
  | { state: 'idle' }
  | { state: 'uploading'; progress: number }
  | { state: 'finishing' }
  | { state: 'failed' };

const NOT_SAVING: VideoSaving = { state: 'idle' };
const UPLOAD_FAILED_STATE: VideoSaving = { state: 'failed' };

function videoSavingAt(progress: number): VideoSaving {
  return progress < 1 ? { state: 'uploading', progress } : { state: 'finishing' };
}

function isSaving(saving: VideoSaving): boolean {
  return saving.state === 'uploading' || saving.state === 'finishing';
}

function videoSavingMessage(saving: VideoSaving): string {
  return saving.state === 'uploading' ? `Uploading video… ${Math.round(saving.progress * 100)}%` : 'Finishing up…';
}

function VideoSaveProgress({ saving }: { saving: VideoSaving }) {
  return (
    <div role="status" className="grid max-w-md gap-2 empty:hidden" data-parity="exercise-video-progress">
      {isSaving(saving) && (
        <>
          <p className="text-sm text-text-secondary tabular-nums">{videoSavingMessage(saving)}</p>
          <Progress
            aria-label="Video upload"
            className="h-1.5"
            value={saving.state === 'uploading' ? saving.progress * 100 : undefined}
          />
        </>
      )}
    </div>
  );
}

type VideoFieldProps = {
  video: VideoState;
  saving: VideoSaving;
  onChange: (video: VideoState) => void;
  onRetry: () => void;
};

function VideoField({ video, saving, onChange, onRetry }: VideoFieldProps) {
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const busy = isSaving(saving);
  const refusal = {
    'aria-invalid': video.error ? true : undefined,
    'aria-describedby': video.error ? errorId : undefined,
  };

  const take = (file: File) => {
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
    <div className="grid gap-3">
      {video.preview ? (
        <>
          <input
            ref={input}
            type="file"
            accept={VIDEO_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) take(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3" data-parity="exercise-video-row">
            <div
              className="relative flex aspect-video w-full max-w-md items-center justify-center overflow-hidden rounded-card bg-surface-inverted"
              data-parity="exercise-video-frame"
            >
              <video
                src={video.preview}
                controls
                playsInline
                preload="metadata"
                aria-label="Demo video preview"
                className="h-full w-full object-contain"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Remove video"
                disabled={busy}
                onClick={() => onChange(NO_VIDEO)}
                className="absolute top-2 right-2 size-8 bg-surface-base shadow-card hover:bg-surface-muted"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Replace video"
              disabled={busy}
              onClick={() => input.current?.click()}
              {...refusal}
            >
              <RefreshCw aria-hidden="true" />
              Replace
            </Button>
          </div>
          <VideoSaveProgress saving={saving} />
          {saving.state === 'failed' && (
            <Alert className="max-w-md" action={<AlertAction onClick={onRetry}>Try again</AlertAction>}>
              {UPLOAD_FAILED}
            </Alert>
          )}
        </>
      ) : (
        <div className="max-w-md">
          <FileDropzone
            accept={VIDEO_ACCEPT}
            prompt={VIDEO_PROMPT}
            hint={VIDEO_GUIDANCE}
            onFileChosen={take}
            {...refusal}
          />
        </div>
      )}
      <p id={errorId} role="alert" className="max-w-md text-xs font-medium text-destructive empty:hidden">
        {video.error}
      </p>
    </div>
  );
}

function ExerciseEditor({ editing, library }: { editing: Exercise | undefined; library: string }) {
  const navigate = useNavigate();
  const { exercises, addExercise, updateExercise, uploadExerciseVideo } = useTraining();
  const [draft, setDraft] = useState<Draft>(editing ? draftFrom(editing) : EMPTY);
  const [video, setVideo] = useState<VideoState>(videoFrom(editing));
  const [saving, setSaving] = useState<VideoSaving>(NOT_SAVING);
  const [touched, setTouched] = useState(false);
  const onPage = useRef(false);

  useEffect(() => {
    onPage.current = true;
    return () => {
      onPage.current = false;
    };
  }, []);

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
    setSaving(NOT_SAVING);
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

  const recordWith = (videoUrl: string | undefined): Exercise => ({
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
    videoUrl,
    thumbnailUrl: editing?.thumbnailUrl,
    archivedAt: editing?.archivedAt,
  });

  const commit = (record: Exercise) => {
    if (editing) {
      updateExercise(record);
      toast.success('Exercise updated');
    } else {
      addExercise(record);
      toast.success('Exercise created');
    }
    navigate(library);
  };

  const uploadThenCommit = async (file: File) => {
    setSaving(videoSavingAt(0));
    try {
      const answer = await uploadExerciseVideo(file, (progress) => setSaving(videoSavingAt(progress)));
      if (!onPage.current) return;
      if (answer.status === 'stored') {
        commit(recordWith(answer.url));
        return;
      }
      setSaving(NOT_SAVING);
      setVideo((current) => ({ ...current, error: videoContentRejectionMessage(file) }));
    } catch {
      setSaving(UPLOAD_FAILED_STATE);
    }
  };

  const busy = isSaving(saving);
  const submitLabel = editing ? 'Save changes' : 'Create exercise';

  const save = () => {
    if (busy) return;
    if (video.file) {
      void uploadThenCommit(video.file);
      return;
    }
    commit(recordWith(video.preview ? editing?.videoUrl : undefined));
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
              required
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
              required={draft.type !== 'cardio'}
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
                required={draft.type !== 'cardio'}
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
                    <CheckboxChip
                      size="compact"
                      aria-label={EXERCISE_TAG_LABELS[tag]}
                      checked={draft.tags.includes(tag)}
                      onCheckedChange={() => set('tags', toggled(draft.tags, tag))}
                    >
                      {EXERCISE_TAG_LABELS[tag]}
                    </CheckboxChip>
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
              data-parity="exercise-cues-row"
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
              <VideoField video={video} saving={saving} onChange={changeVideo} onRetry={save} />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3" data-parity="exercise-editor-actions">
        <Link to={library} className={buttonVariants({ variant: 'ghost', size: 'md' })}>
          Cancel
        </Link>
        <Button
          onClick={save}
          variant="primary"
          size="md"
          disabled={!isValidDraft(problems) || busy}
          aria-busy={busy || undefined}
        >
          {busy ? (
            'Saving…'
          ) : (
            <>
              <Check size={16} />
              {submitLabel}
            </>
          )}
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
