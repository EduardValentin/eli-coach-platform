import { useState, type Ref, type RefObject } from 'react';
import { useDrag } from 'react-dnd';
import { GripVertical, Plus, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { MOVEMENT_PATTERN_LABELS, MOVEMENT_PATTERNS, MUSCLES, labelsOf, type Equipment, type Muscle, type MovementPattern } from '../../../domain/exercises';
import { pickableItems } from '../../../domain/libraryLifecycle';
import { MultiSelect } from '../../MultiSelect';
import { SearchField } from '../../SearchField';
import { WatchVideoButton } from '../../WatchVideoButton';
import { Badge } from '../../ui/badge';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { LIBRARY_EXERCISE, type LibraryItem } from './sessionDnd';
import { SegmentedChoice } from './SegmentedChoice';

export type LibraryType = 'resistance' | 'mobility' | 'cardio';
export type EquipmentFilter = 'hers' | 'bodyweight';
export type LibraryPurpose = { key: string; label: string; type: LibraryType; patterns: MovementPattern[]; equipment: EquipmentFilter };
export type LibraryPresentation = 'pane' | 'drawer';

type LibraryPanelProps = {
  presentation: LibraryPresentation;
  purpose: LibraryPurpose | null;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  asideRef: RefObject<HTMLElement>;
  searchRef: RefObject<HTMLInputElement>;
  onAdd: (exercise: Exercise) => void;
  onDismissPurpose: () => void;
  onClose: () => void;
};

const MUSCLE_LABELS = labelsOf(MUSCLES);
const TYPE_OPTIONS: { value: LibraryType; label: string }[] = [
  { value: 'resistance', label: 'Resistance' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'cardio', label: 'Cardio' },
];

function toggled<Value extends string>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value) ? values.filter(other => other !== value) : [...values, value];
}

function anyOf<Value>(chosen: readonly Value[], values: readonly Value[]): boolean {
  return chosen.length === 0 || values.some(value => chosen.includes(value));
}

function LibraryExerciseCard({ exercise, onAdd }: { exercise: Exercise; onAdd: (exercise: Exercise) => void }) {
  const [{ isDragging }, drag] = useDrag<LibraryItem, void, { isDragging: boolean }>(
    () => ({ type: LIBRARY_EXERCISE, item: { exercise }, collect: monitor => ({ isDragging: monitor.isDragging() }) }),
    [exercise],
  );
  return (
    <div
      ref={drag as unknown as Ref<HTMLDivElement>}
      className={cn(
        'group flex cursor-grab touch-none items-start select-none gap-2 rounded-control border bg-card p-3 transition-shadow hover:shadow-card active:cursor-grabbing motion-reduce:transition-none',
        { 'border-primary opacity-50': isDragging, 'border-border': !isDragging },
      )}
    >
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="text-sm leading-tight font-medium text-text-primary">{exercise.name}</p>
        {exercise.primaryMuscles.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {exercise.primaryMuscles.map(muscle => (
              <Badge key={muscle} tone="muted">
                {muscle}
              </Badge>
            ))}
          </span>
        )}
        {exercise.equipment.length > 0 && <span className="text-xs text-text-secondary">{exercise.equipment.join(', ')}</span>}
        {exercise.videoUrl && <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} />}
      </div>
      <span className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon-xs" aria-label={`Add ${exercise.name}`} onClick={() => onAdd(exercise)}>
          <Plus aria-hidden="true" />
        </Button>
        <GripVertical aria-hidden="true" size={16} className="text-text-secondary group-hover:text-primary" />
      </span>
    </div>
  );
}

function PurposeChip({ purpose, onDismiss }: { purpose: LibraryPurpose; onDismiss: () => void }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-field bg-primary-soft py-1 pr-1 pl-3 text-sm font-medium text-primary">
      <span className="min-w-0 truncate">{purpose.label}</span>
      <Button variant="ghost" size="icon-xs" aria-label="Stop adding" onClick={onDismiss}>
        <X aria-hidden="true" />
      </Button>
    </p>
  );
}

export function LibraryPanel({ presentation, purpose, library, equipment, asideRef, searchRef, onAdd, onDismissPurpose, onClose }: LibraryPanelProps) {
  const [query, setQuery] = useState('');
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [onlyHers, setOnlyHers] = useState(true);
  const [bodyweightOnly, setBodyweightOnly] = useState(false);
  const [type, setType] = useState<LibraryType>('resistance');
  const [appliedPurpose, setAppliedPurpose] = useState<string | null>(null);
  const isDrawer = presentation === 'drawer';
  if (purpose && purpose.key !== appliedPurpose) {
    setAppliedPurpose(purpose.key);
    setType(purpose.type);
    setPatterns(purpose.patterns);
    setBodyweightOnly(purpose.equipment === 'bodyweight');
  }
  const needle = query.trim().toLowerCase();
  const shown = pickableItems(library)
    .filter(exercise => exercise.archivedAt === undefined && exercise.type === type)
    .filter(exercise => exercise.name.toLowerCase().includes(needle))
    .filter(exercise => type !== 'resistance' || anyOf(patterns, exercise.pattern ? [exercise.pattern] : []))
    .filter(exercise => anyOf(muscles, exercise.primaryMuscles))
    .filter(exercise => !onlyHers || exercise.equipment.every(item => equipment.includes(item)))
    .filter(exercise => !bodyweightOnly || exercise.equipment.length === 0);

  return (
    <>
      {isDrawer && <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay-medium" data-parity="drawer-backdrop" onClick={onClose} />}
      <aside
        ref={asideRef}
        aria-label="Exercise library"
        className={cn('flex w-80 shrink-0 flex-col border-border bg-card', {
          'border-l': !isDrawer,
          'fixed inset-y-0 right-0 z-50 max-w-[calc(100vw-2rem)] shadow-drawer': isDrawer,
        })}
      >
        <div className="grid gap-3 border-b border-border-subtle p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className={WIDGET_TITLE_CLASS}>Exercise library</h2>
            {isDrawer && (
              <Button onClick={onClose} variant="ghost" size="icon-sm" aria-label="Close exercise library">
                <X aria-hidden="true" size={18} />
              </Button>
            )}
          </div>
          {purpose && <PurposeChip purpose={purpose} onDismiss={onDismissPurpose} />}
          <SearchField ref={searchRef} size="sm" aria-label="Search exercises" placeholder="Search exercises" value={query} onChange={event => setQuery(event.target.value)} />
          <SegmentedChoice legend="Exercise type" options={TYPE_OPTIONS} value={type} onChange={setType} />
          <div className="grid grid-cols-2 gap-2">
            {type === 'resistance' && (
              <MultiSelect label="Pattern" selected={patterns} options={MOVEMENT_PATTERNS} labels={MOVEMENT_PATTERN_LABELS} onToggle={value => setPatterns(toggled(patterns, value))} />
            )}
            <MultiSelect label="Muscle" selected={muscles} options={MUSCLES} labels={MUSCLE_LABELS} onToggle={value => setMuscles(toggled(muscles, value))} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <Switch checked={onlyHers} onCheckedChange={setOnlyHers} aria-label="Only her equipment" />
              Only her equipment
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <Switch checked={bodyweightOnly} onCheckedChange={setBodyweightOnly} aria-label="Bodyweight" />
              Bodyweight
            </label>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-page p-3">
          {shown.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-text-secondary">No exercises match.</p>
          ) : (
            <ul aria-label="Exercises" className="grid gap-2">
              {shown.map(exercise => (
                <li key={exercise.id}>
                  <LibraryExerciseCard exercise={exercise} onAdd={onAdd} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
