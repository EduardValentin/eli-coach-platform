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
import { IconActionButton } from '../../IconActionButton';
import { MultiSelect } from '../../MultiSelect';
import { RemovableChip } from '../../RemovableChip';
import { SearchField } from '../../SearchField';
import { WatchVideoButton } from '../../WatchVideoButton';
import { Badge } from '../../ui/badge';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Sheet, SheetContent, SheetTitle } from '../../ui/sheet';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { useEditorAnnouncer } from './editorAnnouncer';
import { usePendingFocus } from './usePendingFocus';
import { LIBRARY_EXERCISE, type LibraryItem } from './sessionDnd';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';

export type LibraryType = 'resistance' | 'mobility' | 'stretching' | 'cardio';
export type LibraryPurpose = {
  key: string;
  label: string;
  destination: string;
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
  searchRef: RefObject<HTMLInputElement>;
  onAdd: (exercise: Exercise) => void;
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
type ActiveFilter = { key: string; label: string; remove: (filters: Filters) => Filters };

const CLEARED_FILTERS: Filters = { query: '', patterns: [], muscles: [], onlyHers: false, bodyweightOnly: false };
const COUNT_ANNOUNCE_DELAY_MS = 600;

function toggled<Value extends string>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value) ? values.filter(other => other !== value) : [...values, value];
}

function anyOf<Value>(chosen: readonly Value[], values: readonly Value[]): boolean {
  return chosen.length === 0 || values.some(value => chosen.includes(value));
}

function activeFilters(filters: Filters, type: LibraryType): ActiveFilter[] {
  const query = filters.query.trim();
  const patterns = type === 'resistance' ? filters.patterns : [];
  return [
    ...(query ? [{ key: 'query', label: `Search: “${query}”`, remove: (current: Filters) => ({ ...current, query: '' }) }] : []),
    ...patterns.map(pattern => ({
      key: `pattern-${pattern}`,
      label: `Pattern: ${MOVEMENT_PATTERN_LABELS[pattern]}`,
      remove: (current: Filters) => ({ ...current, patterns: current.patterns.filter(other => other !== pattern) }),
    })),
    ...filters.muscles.map(muscle => ({
      key: `muscle-${muscle}`,
      label: `Muscle: ${MUSCLE_LABELS[muscle]}`,
      remove: (current: Filters) => ({ ...current, muscles: current.muscles.filter(other => other !== muscle) }),
    })),
    ...(filters.onlyHers ? [{ key: 'only-hers', label: 'Only her equipment', remove: (current: Filters) => ({ ...current, onlyHers: false }) }] : []),
    ...(filters.bodyweightOnly ? [{ key: 'bodyweight', label: 'Bodyweight', remove: (current: Filters) => ({ ...current, bodyweightOnly: false }) }] : []),
  ];
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
        <IconActionButton icon={Plus} label={`Add ${exercise.name}`} hint="Add exercise" onClick={() => onAdd(exercise)} />
        <GripVertical aria-hidden="true" size={16} className="text-text-secondary group-hover:text-primary" />
      </span>
    </div>
  );
}

type NoMatchesProps = {
  type: LibraryType;
  filters: readonly ActiveFilter[];
  containerRef: RefObject<HTMLDivElement>;
  onRemove: (filter: ActiveFilter, index: number) => void;
  onClear: () => void;
};

function NoMatches({ type, filters, containerRef, onRemove, onClear }: NoMatchesProps) {
  const kind = `${TYPE_OPTIONS.find(option => option.value === type)?.label.toLowerCase()} exercises`;
  if (filters.length === 0) return <p className="px-1 py-4 text-sm text-text-secondary">{`No ${kind} yet.`}</p>;
  return (
    <div ref={containerRef} className="grid justify-items-start gap-4 px-1 py-4">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-text-primary">No matches</p>
        <p className="text-sm text-text-secondary">{`No ${kind} match these filters. Remove one to see more.`}</p>
      </div>
      <ul aria-label="Active filters" className="flex flex-wrap gap-2">
        {filters.map((filter, index) => (
          <RemovableChip key={filter.key} label={filter.label} removeLabel={`Remove filter ${filter.label}`} onRemove={() => onRemove(filter, index)} />
        ))}
      </ul>
      <Button variant="outline" size="xs" data-clear-filters="" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-text-primary">
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      {label}
    </label>
  );
}

type FrameProps = { isDrawer: boolean; headingId: string; onClose: () => void; children: ReactNode };

function LibraryFrame({ isDrawer, headingId, onClose, children }: FrameProps) {
  if (!isDrawer) {
    return (
      <aside aria-labelledby={headingId} className="flex w-80 max-w-[40%] shrink-0 flex-col border-l border-border bg-card">
        {children}
      </aside>
    );
  }
  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent padding="flush" width="sm" aria-describedby={undefined} className="bg-card">
        {children}
      </SheetContent>
    </Sheet>
  );
}

function LibraryHeading({ isDrawer, headingId }: { isDrawer: boolean; headingId: string }) {
  if (isDrawer) {
    return (
      <SheetTitle className={cn(WIDGET_TITLE_CLASS, 'flex min-h-12 items-center font-sans')}>
        Exercise library
      </SheetTitle>
    );
  }
  return (
    <h2 id={headingId} className={WIDGET_TITLE_CLASS}>
      Exercise library
    </h2>
  );
}

export function LibraryPanel({ presentation, purpose, library, equipment, searchRef, onAdd, onClose }: LibraryPanelProps) {
  const [filters, setFilters] = useState<Filters>({ ...CLEARED_FILTERS, onlyHers: true });
  const [type, setType] = useState<LibraryType>('resistance');
  const [appliedPurpose, setAppliedPurpose] = useState<string | null>(null);
  const announce = useEditorAnnouncer();
  const focusLater = usePendingFocus();
  const noMatches = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const purposeId = useId();
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
  }

  function removeFilter(filter: ActiveFilter, index: number) {
    setFilters(filter.remove);
    focusLater(() => {
      const chips = [...(noMatches.current?.querySelectorAll<HTMLElement>('li button') ?? [])];
      return chips[index] ?? chips.at(-1) ?? searchRef.current;
    });
  }

  function clearFilters() {
    setFilters(CLEARED_FILTERS);
    focusLater(() => searchRef.current);
  }

  return (
    <LibraryFrame isDrawer={isDrawer} headingId={headingId} onClose={onClose}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-border-subtle p-4">
        <LibraryHeading isDrawer={isDrawer} headingId={headingId} />
        {purpose && (
          <p id={purposeId} className="sr-only">
            {purpose.label}
          </p>
        )}
        <SearchField
          ref={searchRef}
          size="sm"
          aria-label="Search exercises"
          aria-describedby={purpose ? purposeId : undefined}
          placeholder="Search exercises"
          value={query}
          onChange={event => change({ query: event.target.value })}
        />
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
        <div className="grid">
          <SwitchRow label="Only her equipment" checked={onlyHers} onCheckedChange={checked => change({ onlyHers: checked })} />
          <SwitchRow label="Bodyweight" checked={bodyweightOnly} onCheckedChange={checked => change({ bodyweightOnly: checked })} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-surface-page p-3">
        {shown.length === 0 ? (
          <NoMatches type={type} filters={activeFilters(filters, type)} containerRef={noMatches} onRemove={removeFilter} onClear={clearFilters} />
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
