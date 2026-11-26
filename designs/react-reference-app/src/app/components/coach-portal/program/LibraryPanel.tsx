import { useEffect, useId, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { useDrag } from 'react-dnd';
import { GripVertical, Plus } from 'lucide-react';
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
import type { LibraryPickRefusal } from '../../../domain/programEditing';
import { counted } from '../../../utils/counted';
import { IconActionButton } from '../../IconActionButton';
import { MultiSelect } from '../../MultiSelect';
import { EmptyState } from '../../EmptyState';
import { RemovableChip } from '../../RemovableChip';
import { SearchField } from '../../SearchField';
import { ExerciseNameButton } from '../../program-view/ExerciseNameButton';
import { exerciseDetailOf } from '../../program-view/exerciseDetailContent';
import { musclesAndEquipmentText } from '../../program-view/programView';
import { Badge } from '../../ui/badge';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { FieldTrigger } from '../../ui/select';
import { Sheet, SheetContent, SheetTitle } from '../../ui/sheet';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { AnnouncementRegion, useAnnouncement, useEditorAnnouncer, type Announce } from './editorAnnouncer';
import { usePendingFocus } from './usePendingFocus';
import { LIBRARY_EXERCISE, type LibraryItem } from './sessionDnd';
import { OptionSelect } from './OptionSelect';

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

const REFUSED_ADD_TEXT: Readonly<Record<LibraryPickRefusal, (name: string) => string>> = {
  'warm-up-full': name => `${name} not added: the warm-up holds four exercises`,
  'already-in-warm-up': name => `${name} is already in the warm-up`,
  'already-in-cool-down': name => `${name} is already in the cool-down`,
  'own-substitution': name => `${name} can’t be its own substitution`,
  'already-a-substitution': name => `${name} is already one of its substitutions`,
  'substitutions-full': name => `${name} not added: an exercise holds two substitutions`,
  'not-cardio': name => `${name} not added: a cardio session takes cardio exercises`,
};

type LibraryPanelProps = {
  presentation: LibraryPresentation;
  purpose: LibraryPurpose | null;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  searchRef: RefObject<HTMLInputElement>;
  onAdd: (exercise: Exercise) => LibraryPickRefusal | undefined;
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

function searchFilters(filters: Filters): ActiveFilter[] {
  const query = filters.query.trim();
  if (!query) return [];
  return [{ key: 'query', label: `Search: “${query}”`, remove: (current: Filters) => ({ ...current, query: '' }) }];
}

function panelFilters(filters: Filters, type: LibraryType): ActiveFilter[] {
  const patterns = type === 'resistance' ? filters.patterns : [];
  return [
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

function useCountAnnouncement(count: number, filtersKey: string, announce: Announce) {
  const firstRender = useRef(true);
  const pendingCountTimer = useRef<number>();
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    pendingCountTimer.current = window.setTimeout(() => announce(count === 0 ? 'No exercises match' : counted(count, 'exercise')), COUNT_ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(pendingCountTimer.current);
  }, [announce, count, filtersKey]);
  return { cancelPending: () => window.clearTimeout(pendingCountTimer.current) };
}

function LibraryExerciseCard({ exercise, onAdd }: { exercise: Exercise; onAdd: (exercise: Exercise) => void }) {
  const [{ isDragging }, drag] = useDrag<LibraryItem, void, { isDragging: boolean }>(
    () => ({ type: LIBRARY_EXERCISE, item: { exercise }, collect: monitor => ({ isDragging: monitor.isDragging() }) }),
    [exercise],
  );
  const facts = musclesAndEquipmentText(exercise);
  return (
    <div
      data-parity="library-exercise-card"
      ref={drag as unknown as Ref<HTMLDivElement>}
      className={cn(
        'group grid cursor-grab touch-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-control border bg-card p-3 select-none transition-shadow hover:shadow-card active:cursor-grabbing motion-reduce:transition-none',
        { 'border-primary opacity-50': isDragging, 'border-border': !isDragging },
      )}
    >
      <ExerciseNameButton exercise={exercise} detail={exerciseDetailOf(exercise, { targets: [], cues: exercise.cues })} weight="medium" size="compact" />
      <span data-parity="library-exercise-card-actions" className="flex items-center gap-6">
        <IconActionButton icon={Plus} label={`Add ${exercise.name}`} hint="Add exercise" onClick={() => onAdd(exercise)} />
        <GripVertical aria-hidden="true" size={16} className="text-text-secondary group-hover:text-primary" />
      </span>
      {facts && <p data-parity="library-exercise-card-facts" className="col-span-2 text-sm break-words text-text-secondary">{facts}</p>}
    </div>
  );
}

type NoMatchesProps = {
  type: LibraryType;
  filters: readonly ActiveFilter[];
  onRemove: (filter: ActiveFilter, index: number) => void;
  onClear: () => void;
};

function NoMatches({ type, filters, onRemove, onClear }: NoMatchesProps) {
  const kind = `${TYPE_OPTIONS.find(option => option.value === type)?.label.toLowerCase()} exercises`;
  if (filters.length === 0) return <p className="px-1 py-4 text-sm text-text-secondary">{`No ${kind} yet.`}</p>;
  return (
    <EmptyState
      density="compact"
      title="No matches"
      description={`No ${kind} match these filters. Remove one to see more.`}
      action={
        <div className="grid justify-items-start gap-6">
          <ul aria-label="Active filters" data-active-filters="" className="flex flex-wrap gap-x-2 gap-y-6">
            {filters.map((filter, index) => (
              <RemovableChip key={filter.key} label={filter.label} removeLabel={`Remove filter ${filter.label}`} onRemove={() => onRemove(filter, index)} />
            ))}
          </ul>
          <Button variant="outline" size="xs" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      }
    />
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

type FiltersPopoverProps = {
  type: LibraryType;
  filters: Filters;
  activeCount: number;
  triggerRef: RefObject<HTMLButtonElement>;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
};

function FiltersPopover({ type, filters, activeCount, triggerRef, onChange, onClear }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const { patterns, muscles, onlyHers, bodyweightOnly } = filters;

  function clear() {
    onClear();
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldTrigger ref={triggerRef} aria-label={activeCount === 0 ? 'Filters' : `Filters, ${activeCount} active`}>
          <span data-slot="select-value">
            Filters
            {activeCount > 0 && <Badge tone="count">{activeCount}</Badge>}
          </span>
        </FieldTrigger>
      </PopoverTrigger>
      <PopoverContent aria-label="Filters" align="end" collisionPadding={16} className="grid gap-4">
        <div className="grid gap-2">
          {type === 'resistance' && (
            <MultiSelect
              label="Pattern"
              selected={patterns}
              options={MOVEMENT_PATTERNS}
              labels={MOVEMENT_PATTERN_LABELS}
              onToggle={value => onChange({ patterns: toggled(patterns, value) })}
            />
          )}
          <MultiSelect label="Muscle" selected={muscles} options={MUSCLES} labels={MUSCLE_LABELS} onToggle={value => onChange({ muscles: toggled(muscles, value) })} />
        </div>
        <div className="grid gap-2">
          <SwitchRow label="Only her equipment" checked={onlyHers} onCheckedChange={checked => onChange({ onlyHers: checked })} />
          <SwitchRow label="Bodyweight" checked={bodyweightOnly} onCheckedChange={checked => onChange({ bodyweightOnly: checked })} />
        </div>
        {activeCount > 0 && (
          <Button variant="outline" size="xs" className="justify-self-start" onClick={clear}>
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type FrameProps = { isDrawer: boolean; headingId: string; onClose: () => void; children: ReactNode };

function LibraryFrame({ isDrawer, headingId, onClose, children }: FrameProps) {
  if (!isDrawer) {
    return (
      <aside data-parity-root="LibraryPanel" aria-labelledby={headingId} className="flex w-80 max-w-[40%] shrink-0 flex-col border-l border-border bg-card">
        {children}
      </aside>
    );
  }
  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent data-parity-root="LibraryPanel" padding="flush" width="sm" aria-describedby={undefined} className="bg-card">
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
  const announceOnPage = useEditorAnnouncer();
  const drawerAnnouncement = useAnnouncement();
  const focusLater = usePendingFocus();
  const content = useRef<HTMLDivElement>(null);
  const filtersTrigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const purposeId = useId();
  const isDrawer = presentation === 'drawer';
  // A modal drawer hides the page's live region, so it speaks from its own while open.
  const announce = isDrawer ? drawerAnnouncement.announce : announceOnPage;
  const addClosesDrawer = isDrawer && purpose !== null;
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
  const fromPanel = panelFilters(filters, type);
  const countAnnouncement = useCountAnnouncement(shown.length, JSON.stringify([type, filters]), announce);

  function add(exercise: Exercise) {
    const refusal = onAdd(exercise);
    countAnnouncement.cancelPending();
    if (refusal) {
      announce(REFUSED_ADD_TEXT[refusal](exercise.name));
      return;
    }
    const announceAdd = addClosesDrawer ? announceOnPage : announce;
    announceAdd(purpose ? `${exercise.name} added to ${purpose.destination}` : `${exercise.name} added`);
  }

  function removeFilter(filter: ActiveFilter, index: number) {
    setFilters(filter.remove);
    focusLater(() => {
      const chips = [...(content.current?.querySelectorAll<HTMLElement>('[data-active-filters] li button') ?? [])];
      return chips[index] ?? chips.at(-1) ?? filtersTrigger.current;
    });
  }

  function clearPanelFilters() {
    change({ patterns: [], muscles: [], onlyHers: false, bodyweightOnly: false });
  }

  function clearFilters() {
    setFilters(CLEARED_FILTERS);
    focusLater(() => searchRef.current);
  }

  return (
    <LibraryFrame isDrawer={isDrawer} headingId={headingId} onClose={onClose}>
      <div ref={content} className="contents">
        {isDrawer && <AnnouncementRegion message={drawerAnnouncement.message} />}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-border-subtle p-4">
          <LibraryHeading isDrawer={isDrawer} headingId={headingId} />
          {purpose && (
            <p id={purposeId} className="sr-only">
              {purpose.label}
            </p>
          )}
          <SearchField
            ref={searchRef}
            aria-label="Search exercises"
            aria-describedby={purpose ? purposeId : undefined}
            placeholder="Search exercises"
            value={query}
            onChange={event => change({ query: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <OptionSelect label="Exercise type" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <FiltersPopover
              type={type}
              filters={filters}
              activeCount={fromPanel.length}
              triggerRef={filtersTrigger}
              onChange={change}
              onClear={clearPanelFilters}
            />
          </div>
        </div>
        <div data-parity="library-results" className="min-h-0 flex-1 overflow-y-auto bg-surface-page p-3">
          {shown.length === 0 ? (
            <NoMatches type={type} filters={[...searchFilters(filters), ...fromPanel]} onRemove={removeFilter} onClear={clearFilters} />
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
      </div>
    </LibraryFrame>
  );
}
