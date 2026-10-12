import { useId, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Check, Dumbbell, Film, PlayCircle, RefreshCw, Target, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TAG_LABELS,
  EXERCISE_TYPES,
  EXERCISE_TYPE_LABELS,
  MEASURES,
  MEASURE_LABELS,
  MUSCLES,
  defaultMeasureFor,
  draftProblems,
  isValidDraft,
  labelsOf,
  type Difficulty,
  type Equipment,
  type ExerciseDraft,
  type ExerciseType,
  type Measure,
  type Muscle,
} from '../../domain/exercises';
import { MP4_ACCEPT, isMp4File, mp4RejectionMessage } from '../../utils/exerciseVideo';
import { toggled } from '../../utils/libraryListing';
import { InlineProblem } from '../../components/InlineProblem';
import { MultiSelect } from '../../components/MultiSelect';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsRow, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { Button as ThemeButton } from '../../components/ThemeButton';
import { ToggleChip } from '../../components/ToggleChip';
import { Button, buttonVariants } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';

const LIBRARY = '/coach/training';
const MUSCLE_LABELS = labelsOf(MUSCLES);
const EQUIPMENT_LABELS = labelsOf(EQUIPMENT);
const DIFFICULTY_LABELS = labelsOf(DIFFICULTIES);
const VIDEO_GUIDANCE = 'MP4 up to 50 MB, in a format that plays well on a phone.';

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
  description: '',
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
    description: exercise.description,
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
  const pickerTrigger = {
    'aria-invalid': video.error ? true : undefined,
    'aria-describedby': errorId,
    onClick: () => input.current?.click(),
  };

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!isMp4File(file)) {
      const message = mp4RejectionMessage(file);
      onChange({ ...video, error: message });
      toast.error(message);
      return;
    }
    onChange({ file, preview: URL.createObjectURL(file), error: null });
  };

  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        accept={MP4_ACCEPT}
        className="hidden"
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {video.preview ? (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-surface-inverted">
          <video src={video.preview} className="h-full w-full object-cover opacity-80" />
          <PlayCircle size={48} className="absolute text-surface-inverted-foreground" aria-hidden="true" />
          <div
            data-surface="inverted"
            className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-surface-inverted/80 via-surface-inverted/40 to-transparent px-2 pt-12 pb-2"
          >
            <ThemeButton type="button" variant="glass" size="xs" aria-label="Replace video" {...pickerTrigger}>
              <RefreshCw size={12} aria-hidden="true" />
              Replace
            </ThemeButton>
            <ThemeButton type="button" variant="glass" size="xs" aria-label="Remove video" onClick={() => onChange(NO_VIDEO)}>
              <Trash2 size={12} aria-hidden="true" />
              Remove
            </ThemeButton>
          </div>
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
          <Button type="button" variant="outline" {...pickerTrigger}>
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

function ExerciseEditor({ editing }: { editing: Exercise | undefined }) {
  const navigate = useNavigate();
  const { exercises, addExercise, updateExercise } = useTraining();
  const [draft, setDraft] = useState<Draft>(editing ? draftFrom(editing) : EMPTY);
  const [video, setVideo] = useState<VideoState>(videoFrom(editing));
  const ids = {
    name: useId(), nameProblem: useId(), type: useId(), measure: useId(), measureHint: useId(), perSide: useId(),
    primary: useId(), secondary: useId(), equipment: useId(), difficulty: useId(), cues: useId(),
  };

  const others = exercises.filter((exercise) => exercise.id !== editing?.id);
  const problems = draftProblems(draft, others);
  const nameProblem = draft.name.trim() === '' ? undefined : problems.name;
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  const chooseType = (type: ExerciseType) =>
    setDraft((previous) => ({
      ...previous,
      type,
      measuredIn: previous.measureTouched ? previous.measuredIn : defaultMeasureFor(type),
    }));
  const chooseMeasure = (measuredIn: Measure) =>
    setDraft((previous) => ({ ...previous, measuredIn, measureTouched: true }));
  const togglePrimary = (muscle: Muscle) =>
    setDraft((previous) => ({
      ...previous,
      primaryMuscles: toggled(previous.primaryMuscles, muscle),
      secondaryMuscles: previous.secondaryMuscles.filter((other) => other !== muscle),
    }));

  const save = () => {
    const record: Exercise = {
      id: editing?.id ?? `e-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.description.trim(),
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
    navigate(LIBRARY);
  };

  return (
    <div className="w-full max-w-3xl">
      <PortalBackLink to={LIBRARY}>Back to exercises</PortalBackLink>
      <PortalPageHeader
        title={editing ? 'Edit exercise' : 'New exercise'}
        subtitle="Say what it is, what it works and how it is measured, so plans can prescribe it."
      />

      <div className="space-y-6 sm:space-y-8">
        <SettingsSection
          headingId="exercise-about-heading"
          title="About the exercise"
          icon={<Dumbbell aria-hidden="true" className="text-brand-secondary" size={18} />}
          description="Its name, what kind of work it is and how a plan prescribes it."
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.name}
              title="Name"
              layout="stacked"
              problem={nameProblem && <InlineProblem id={ids.nameProblem}>{nameProblem}</InlineProblem>}
            >
              <Input
                id={ids.name}
                value={draft.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="e.g. Barbell back squat"
                aria-invalid={nameProblem ? true : undefined}
                aria-describedby={nameProblem ? ids.nameProblem : undefined}
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
            <SettingsRow
              htmlFor={ids.measure}
              title="Measured in"
              layout="stacked"
              description="Pre-filled from the type; change it for a timed hold or a carry."
              descriptionId={ids.measureHint}
            >
              <Select value={draft.measuredIn} onValueChange={(value) => chooseMeasure(value as Measure)}>
                <SelectTrigger id={ids.measure} aria-describedby={ids.measureHint}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEASURES.map((measure) => (
                    <SelectItem key={measure} value={measure}>{MEASURE_LABELS[measure]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow title="Sides" layout="stacked">
              <label htmlFor={ids.perSide} className="flex items-center gap-2 text-sm text-text-primary">
                <Checkbox id={ids.perSide} checked={draft.perSide} onCheckedChange={(checked) => set('perSide', checked === true)} />
                Performed one side at a time
              </label>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="exercise-work-heading"
          title="What it works"
          icon={<Target aria-hidden="true" className="text-brand-secondary" size={18} />}
          description="Muscles, equipment and how the library files it."
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={ids.primary}
              title="Primary muscles"
              layout="stacked"
              problem={problems.primaryMuscles && <InlineProblem>{problems.primaryMuscles}</InlineProblem>}
            >
              <MultiSelect
                id={ids.primary}
                label="Primary muscles"
                summary="names"
                size="md"
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
            <SettingsRow title="Tags" layout="stacked">
              <ul className="flex flex-wrap gap-2">
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
          description="What the client reads and watches before she does it."
        >
          <SettingsRows>
            <SettingsRow htmlFor={ids.cues} title="Form cues" layout="stacked">
              <Textarea id={ids.cues} rows={3} value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="Keep the chest up, drive through the heels…" />
            </SettingsRow>
            <SettingsRow title="Demo video" layout="stacked">
              <VideoField video={video} onChange={setVideo} />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <Link to={LIBRARY} className={buttonVariants({ variant: 'ghost', size: 'md' })}>
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
  const editing = exerciseId ? exercises.find((exercise) => exercise.id === exerciseId) : undefined;
  if (exerciseId && !editing) return <Navigate to={LIBRARY} replace />;
  return <ExerciseEditor key={editing?.id ?? 'new'} editing={editing} />;
}
