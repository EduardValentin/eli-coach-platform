import { useEffect, useId, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { useDrag } from 'react-dnd';
import { GripVertical, Plus, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import {
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_PATTERNS,
  MUSCLES,
  labelsOf,
  type Equipment,
  type ExerciseTag,
  type Muscle,
  type MovementPattern,
} from '../../../domain/exercises';
import { pickableItems } from '../../../domain/libraryLifecycle';
import { counted } from '../../../utils/counted';
import { MultiSelect } from '../../MultiSelect';
import { SearchField } from '../../SearchField';
import { WatchVideoButton } from '../../WatchVideoButton';
import { Badge } from '../../ui/badge';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { LIBRARY_EXERCISE, type LibraryItem } from './sessionDnd';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';

export type LibraryType = 'resistance' | 'mobility' | 'stretching' | 'cardio';
export type LibraryPurpose = {
  key: string;
  label: string;
  destination: string;
  place: string;
  type: LibraryType;
  alsoTagged?: ExerciseTag;
  patterns: MovementPattern[];
};
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

type Filters = { query: string; patterns: MovementPattern[]; muscles: Muscle[]; onlyHers: boolean; bodyweightOnly: boolean };

const MUSCLE_LABELS = labelsOf(MUSCLES);
const TYPE_OPTIONS: { value: LibraryType; label: string }[] = [
  { value: 'resistance', label: 'Resistance' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'cardio', label: 'Cardio' },
];
const CLEARED_FILTERS: Filters = { query: '', patterns: [], muscles: [], onlyHers: false, bodyweightOnly: false };
const COUNT_ANNOUNCE_DELAY_MS = 600;

function toggled<Value extends string>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value) ? values.filter(other => other !== value) : [...values, value];
}

function anyOf<Value>(chosen: readonly Value[], values: readonly Value[]): boolean {
  return chosen.length === 0 || values.some(value => chosen.includes(value));
}

function activeFilterNames(filters: Filters, type: LibraryType): string[] {
  const query = filters.query.trim();
  return [
    ...(query ? [`“${query}”`] : []),
    ...(type === 'resistance' && filters.patterns.length > 0 ? [`Pattern: ${filters.patterns.map(pattern => MOVEMENT_PATTERN_LABELS[pattern]).join(', ')}`] : []),
    ...(filters.muscles.length > 0 ? [`Muscle: ${filters.muscles.map(muscle => MUSCLE_LABELS[muscle]).join(', ')}`] : []),
    ...(filters.onlyHers ? ['Only her equipment'] : []),
    ...(filters.bodyweightOnly ? ['Bodyweight'] : []),
  ];
}

function useInertOutside(root: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    const own = root.current;
    if (!active || !own) return;
    const inerted: Element[] = [];
    for (let node: Element = own; node.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || sibling.hasAttribute('inert') || sibling.matches('[role="status"], [aria-live], script')) continue;
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
    }
    return () => inerted.forEach(sibling => sibling.removeAttribute('inert'));
  }, [root, active]);
}

function useCountAnnouncement(count: number, filtersKey: string) {
  const announce = useEditorAnnouncer();
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => announce(count === 0 ? 'No exercises match' : counted(count, 'exercise')), COUNT_ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [announce, count, filtersKey]);
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
        <p className="text-sm leading-tight font-medium break-words text-text-primary">{exercise.name}</p>
        {exercise.primaryMuscles.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {exercise.primaryMuscles.map(muscle => (
              <Badge key={muscle} tone="muted" className="max-w-full break-words whitespace-normal">
                {muscle}
              </Badge>
            ))}
          </span>
        )}
        {exercise.equipment.length > 0 && <span className="text-xs break-words text-text-secondary">{exercise.equipment.join(', ')}</span>}
      </div>
      <span className="flex items-center gap-4">
        {exercise.videoUrl && <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} appearance="icon" />}
        <Button variant="ghost" size="icon-xs" aria-label={`Add ${exercise.name}`} onClick={() => onAdd(exercise)}>
          <Plus aria-hidden="true" />
        </Button>
        <GripVertical aria-hidden="true" size={16} className="text-text-secondary group-hover:text-primary" />
      </span>
    </div>
  );
}

function PurposeChip({ purpose, added, onDismiss }: { purpose: LibraryPurpose; added: boolean; onDismiss: () => void }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="flex min-w-0 items-center justify-between gap-2 rounded-field bg-primary-soft py-1 pr-1 pl-3 text-sm font-medium text-primary">
        <span className="min-w-0 truncate">{purpose.label}</span>
        <Button variant="ghost" size="icon-xs" aria-label="Stop adding" onClick={onDismiss}>
          <X aria-hidden="true" />
        </Button>
      </p>
      {added && <p className="px-1 text-xs text-text-secondary">{`Added to ${purpose.place}`}</p>}
    </div>
  );
}

function NoMatches({ type, filters, onClear }: { type: LibraryType; filters: Filters; onClear: () => void }) {
  const names = activeFilterNames(filters, type);
  const kind = `${TYPE_OPTIONS.find(option => option.value === type)?.label.toLowerCase()} exercises`;
  return (
    <div className="grid justify-items-center gap-3 px-1 py-6 text-center">
      <p className="text-sm text-text-secondary">{names.length > 0 ? `No ${kind} match ${names.join(' · ')}.` : `No ${kind} yet.`}</p>
      {names.length > 0 && (
        <Button variant="outline" size="xs" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

type FrameProps = { isDrawer: boolean; headingId: string; asideRef: RefObject<HTMLElement>; onClose: () => void; children: ReactNode };

function LibraryFrame({ isDrawer, headingId, asideRef, onClose, children }: FrameProps) {
  const drawerRoot = useRef<HTMLDivElement>(null);
  useInertOutside(drawerRoot, isDrawer);
  if (!isDrawer) {
    return (
      <aside ref={asideRef} aria-labelledby={headingId} className="flex w-80 max-w-[40%] shrink-0 flex-col border-l border-border bg-card">
        {children}
      </aside>
    );
  }
  return (
    <div ref={drawerRoot}>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-overlay-medium" data-parity="drawer-backdrop" onClick={onClose} />
      <div
        ref={asideRef as RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[calc(100vw-2rem)] shrink-0 flex-col bg-card shadow-drawer"
      >
        {children}
      </div>
    </div>
  );
}

export function LibraryPanel({ presentation, purpose, library, equipment, asideRef, searchRef, onAdd, onDismissPurpose, onClose }: LibraryPanelProps) {
  const [filters, setFilters] = useState<Filters>({ ...CLEARED_FILTERS, onlyHers: true });
  const [type, setType] = useState<LibraryType>('resistance');
  const [appliedPurpose, setAppliedPurpose] = useState<string | null>(null);
  const [addedFor, setAddedFor] = useState<string | null>(null);
  const announce = useEditorAnnouncer();
  const headingId = useId();
  const isDrawer = presentation === 'drawer';
  const { query, patterns, muscles, onlyHers, bodyweightOnly } = filters;
  const change = (next: Partial<Filters>) => setFilters(current => ({ ...current, ...next }));
  if (purpose && purpose.key !== appliedPurpose) {
    setAppliedPurpose(purpose.key);
    setType(purpose.type);
    setFilters(current => ({ ...current, patterns: purpose.patterns, bodyweightOnly: false }));
  }
  const needle = query.trim().toLowerCase();
  const alsoTagged = purpose?.type === type ? purpose.alsoTagged : undefined;
  const ofType = (exercise: Exercise) => exercise.type === type || (alsoTagged !== undefined && exercise.tags.includes(alsoTagged));
  const shown = pickableItems(library)
    .filter(exercise => exercise.archivedAt === undefined && ofType(exercise))
    .filter(exercise => exercise.name.toLowerCase().includes(needle))
    .filter(exercise => type !== 'resistance' || anyOf(patterns, exercise.pattern ? [exercise.pattern] : []))
    .filter(exercise => anyOf(muscles, exercise.primaryMuscles))
    .filter(exercise => !onlyHers || exercise.equipment.every(item => equipment.includes(item)))
    .filter(exercise => !bodyweightOnly || exercise.equipment.length === 0);
  useCountAnnouncement(shown.length, JSON.stringify([type, filters]));

  function add(exercise: Exercise) {
    onAdd(exercise);
    announce(purpose ? `${exercise.name} added to ${purpose.destination}` : `${exercise.name} added`);
    setAddedFor(purpose?.key ?? null);
  }

  return (
    <LibraryFrame isDrawer={isDrawer} headingId={headingId} asideRef={asideRef} onClose={onClose}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-border-subtle p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id={headingId} className={WIDGET_TITLE_CLASS}>
            Exercise library
          </h2>
          {isDrawer && (
            <Button onClick={onClose} variant="ghost" size="icon-sm" aria-label="Close exercise library">
              <X aria-hidden="true" size={18} />
            </Button>
          )}
        </div>
        {purpose && <PurposeChip purpose={purpose} added={addedFor === purpose.key} onDismiss={onDismissPurpose} />}
        <label className="relative hit-area block">
          <SearchField ref={searchRef} size="sm" aria-label="Search exercises" placeholder="Search exercises" value={query} onChange={event => change({ query: event.target.value })} />
        </label>
        <ChoiceGroup size="xs" aria-label="Exercise type" value={type} onValueChange={value => setType(value as LibraryType)}>
          {TYPE_OPTIONS.map(option => (
            <ChoiceOption key={option.value} value={option.value}>
              {option.label}
            </ChoiceOption>
          ))}
        </ChoiceGroup>
        <div className="grid grid-cols-2 gap-2">
          {type === 'resistance' && (
            <MultiSelect
              label="Pattern"
              selected={patterns}
              options={MOVEMENT_PATTERNS}
              labels={MOVEMENT_PATTERN_LABELS}
              onToggle={value => change({ patterns: toggled(patterns, value) })}
            />
          )}
          <MultiSelect label="Muscle" selected={muscles} options={MUSCLES} labels={MUSCLE_LABELS} onToggle={value => change({ muscles: toggled(muscles, value) })} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          <label className="flex min-h-12 items-center gap-2 text-sm text-text-primary">
            <Switch checked={onlyHers} onCheckedChange={checked => change({ onlyHers: checked })} aria-label="Only her equipment" />
            Only her equipment
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm text-text-primary">
            <Switch checked={bodyweightOnly} onCheckedChange={checked => change({ bodyweightOnly: checked })} aria-label="Bodyweight" />
            Bodyweight
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-page p-3">
        {shown.length === 0 ? (
          <NoMatches type={type} filters={filters} onClear={() => setFilters(CLEARED_FILTERS)} />
        ) : (
          <ul aria-label="Exercises" className="grid gap-3">
            {shown.map(exercise => (
              <li key={exercise.id}>
                <LibraryExerciseCard exercise={exercise} onAdd={add} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </LibraryFrame>
  );
}
