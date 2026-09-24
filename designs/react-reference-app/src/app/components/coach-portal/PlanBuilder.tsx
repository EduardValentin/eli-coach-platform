import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Search,
  Activity,
  Info,
  ArrowLeft,
  Filter,
  MoreVertical,
  Copy,
  ArrowLeftRight,
  MessageSquare,
  Layers,
  PanelLeftOpen,
  Library,
} from 'lucide-react';
import {
  useTraining,
  PlanWeek,
  PlanDay,
  PlanExercise,
  DayType,
  Exercise,
} from '../../context/TrainingContext';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { ExerciseFilters } from './ExerciseFilters';
import {
  matchesExerciseFilters,
  type ExerciseFilter,
} from '../../utils/exerciseFilters';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { SearchField } from '../SearchField';
import { EmptyState } from '../EmptyState';
import { LABEL_CLASS, WIDGET_TITLE_CLASS, VALUE_CLASS } from '../typography';
import { cn } from '../ui/utils';

// ── Constants ────────────────────────────────────────────────────────

const DAY_TYPES: DayType[] = [
  'Rest',
  'Recovery',
  'Strength',
  'Hypertrophy',
  'Lighter',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function getDayTypeColor(type: DayType) {
  switch (type) {
    case 'Strength':
      return 'var(--training-strength)';
    case 'Hypertrophy':
      return 'var(--training-hypertrophy)';
    case 'Recovery':
      return 'var(--training-recovery)';
    case 'Lighter':
      return 'var(--training-lighter)';
    default:
      return 'var(--training-rest)';
  }
}

function getDayTypeBadgeClass(type: DayType) {
  switch (type) {
    case 'Strength':
      return 'border-transparent bg-training-strength-soft text-training-strength';
    case 'Hypertrophy':
      return 'border-transparent bg-training-hypertrophy-soft text-training-hypertrophy';
    case 'Recovery':
      return 'border-transparent bg-training-recovery-soft text-training-recovery';
    case 'Lighter':
      return 'border-transparent bg-training-lighter-soft text-training-lighter';
    default:
      return 'border-transparent bg-transparent text-training-rest';
  }
}

/** Floating drag preview — TouchBackend renders no native drag image. */
function CustomDragLayer() {
  const { isDragging, item, itemType, offset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as any,
    itemType: monitor.getItemType(),
    offset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || !offset) return null;

  const label =
    itemType === 'LIBRARY_EXERCISE'
      ? (item?.exercise?.name ?? 'Exercise')
      : (item?.label ?? 'Exercise');

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-card px-3 py-2 shadow-raised">
        <GripVertical size={14} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
    </div>
  );
}

// ── DnD Subcomponents ────────────────────────────────────────────────

function DropSeparator({
  index,
  onDrop,
  isTrailing,
}: {
  index: number;
  onDrop: (item: any, idx: number) => void;
  isTrailing?: boolean;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ['LIBRARY_EXERCISE', 'PLAN_EXERCISE'],
      drop: (item) => onDrop(item, index),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [onDrop, index],
  );

  return (
    <div
      ref={drop as any}
      className={`z-10 relative group/drop cursor-default ${
        isTrailing
          ? 'min-h-[200px] flex-1 flex items-start pt-4'
          : canDrop
            ? 'py-4 -my-2'
            : 'py-3'
      }`}
    >
      <div
        className={`h-0.5 transition-all duration-200 rounded-full mx-4 ${isTrailing ? 'w-full' : ''} ${
          isOver
            ? 'h-2 bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_50%,transparent)]'
            : 'bg-transparent group-hover/drop:bg-border'
        }`}
      />
    </div>
  );
}

/** Large drop target shown when a day has no exercises yet */
function EmptyDropTarget({ onDrop }: { onDrop: (item: any) => void }) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ['LIBRARY_EXERCISE', 'PLAN_EXERCISE'],
      drop: (item) => onDrop(item),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [onDrop],
  );

  return (
    <div
      ref={drop as any}
      className={`py-16 text-center border-2 border-dashed rounded-card mt-4 flex flex-col items-center transition-all duration-200 ${
        isOver && canDrop
          ? 'border-primary bg-primary-soft text-primary'
          : canDrop
            ? 'border-primary/30 bg-primary-soft text-text-secondary'
            : 'border-border bg-surface-quiet text-text-secondary'
      }`}
    >
      <Plus
        size={32}
        className={`mb-4 ${isOver && canDrop ? 'text-primary' : 'text-text-secondary'}`}
      />
      <p
        className={`font-medium ${isOver && canDrop ? 'text-primary' : 'text-text-secondary'}`}
      >
        {isOver && canDrop ? 'Drop to add exercise' : 'Drag exercises here'}
      </p>
      <p className="text-sm mt-1">
        Pull items from the library on the right, or click the + icon to
        quick-add.
      </p>
    </div>
  );
}

/** A full-area drop zone that acts as a "catch-all" — appends exercise to end of list */
function FullAreaDropZone({
  onDrop,
  children,
}: {
  onDrop: (item: any) => void;
  children: React.ReactNode;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['LIBRARY_EXERCISE'],
    drop: (item, monitor) => {
      // Only handle if not already handled by a more specific target (DropSeparator or PlanGroupCard)
      if (monitor.didDrop()) return;
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop as any}
      className={`flex-1 transition-colors duration-200 ${
        isOver && canDrop ? 'bg-primary-soft' : ''
      }`}
    >
      {children}
    </div>
  );
}

function LibraryExerciseCard({
  ex,
  onQuickAdd,
}: {
  ex: Exercise;
  onQuickAdd: (ex: Exercise) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'LIBRARY_EXERCISE',
      item: { type: 'LIBRARY_EXERCISE', exercise: ex },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [ex],
  );

  const [flashed, setFlashed] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(ex);
    setFlashed(true);
    setTimeout(() => setFlashed(false), 600);
  };

  return (
    <div
      ref={drag as any}
      className={`p-3 bg-card border rounded-control hover:shadow-card transition-all group flex flex-col cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-50 ring-2 ring-primary'
          : flashed
            ? 'ring-2 ring-primary/50 border-primary/30'
            : 'border-border'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-text-primary leading-tight">
          {ex.name}
        </p>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleQuickAdd}
            variant="ghost"
            size="icon-sm"
            className="size-6 opacity-0 group-hover:opacity-100"
            aria-label="Add to current day"
            title="Add to current day"
          >
            <Plus size={14} />
          </Button>
          <div className="text-text-secondary group-hover:text-primary transition-colors">
            <GripVertical size={16} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-auto">
        {ex.tags?.map((t) => (
          <Badge key={t} tone="brand-secondary">
            {t}
          </Badge>
        ))}
        {ex.primaryMuscles.map((m) => (
          <Badge key={m} tone="muted">
            {m}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PlanGroupCard({
  group,
  onDropOnGroup,
  handleRemoveExercise,
  handleUpdateExerciseData,
  handleRemoveSuperset,
  exercises,
  selectedForSuperset,
  toggleSelectForSuperset,
  expandedNotes,
  toggleNotes,
}: any) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'PLAN_EXERCISE',
      item: {
        type: 'PLAN_EXERCISE',
        id: group.id,
        label: group.isSuperset
          ? 'Superset'
          : (exercises.find((e: any) => e.id === group.items[0]?.exerciseId)
              ?.name ?? 'Exercise'),
      },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [group.id],
  );

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ['PLAN_EXERCISE'],
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        onDropOnGroup(item, group.id);
      },
      collect: (monitor) => ({ isOver: !!monitor.isOver({ shallow: true }) }),
    }),
    [onDropOnGroup, group.id],
  );

  return (
    <div
      ref={drop as any}
      className={`relative rounded-card bg-card border transition-colors ${
        isOver
          ? 'border-brand-secondary shadow-card ring-2 ring-brand-secondary/20 bg-brand-secondary-soft'
          : group.isSuperset
            ? 'border-brand-secondary shadow-card'
            : 'border-border shadow-card'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {group.isSuperset && (
        <div
          className="bg-brand-secondary text-brand-secondary-foreground px-4 py-2 rounded-t-control flex justify-between items-center text-xs font-semibold uppercase tracking-label cursor-grab active:cursor-grabbing"
          ref={drag as any}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={14} />
            <span>Superset</span>
          </div>
          <Button
            onClick={() => handleRemoveSuperset(group.id)}
            variant="ghost"
            size="xs"
            className="h-auto p-0 text-brand-secondary-foreground hover:bg-transparent hover:opacity-80"
          >
            Ungroup
          </Button>
        </div>
      )}

      <div className={`p-2 space-y-2 ${!group.isSuperset ? 'pt-2' : ''}`}>
        {group.items.map((pe: PlanExercise, itemIdx: number) => {
          const ex = exercises.find((e: any) => e.id === pe.exerciseId);
          if (!ex) return null;
          const isSelected = selectedForSuperset.includes(pe.id);
          const hasNotes = !!pe.notes;
          const isNotesOpen = expandedNotes.has(pe.id);
          const exerciseNumber = (group.baseIndex ?? 0) + itemIdx + 1;

          return (
            <div key={pe.id}>
              <div
                className={`p-4 rounded-control transition-colors ${
                  isSelected
                    ? 'bg-primary-soft border border-primary/30'
                    : 'bg-card hover:bg-muted'
                } ${!group.isSuperset ? 'border border-transparent hover:border-border' : ''}`}
              >
                {/* Row 1: Exercise name + actions */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-surface-inverted text-surface-inverted-foreground text-caption font-semibold flex items-center justify-center shrink-0">
                    {exerciseNumber}
                  </span>

                  {!group.isSuperset && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectForSuperset(pe.id)}
                      aria-label="Select exercise for superset"
                      className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )}

                  {!group.isSuperset && (
                    <div
                      className="text-text-secondary cursor-grab active:cursor-grabbing shrink-0"
                      ref={drag as any}
                    >
                      <GripVertical size={16} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={VALUE_CLASS}>{ex.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {ex.primaryMuscles.map((m: string) => (
                        <Badge key={m} tone="muted">
                          {m}
                        </Badge>
                      ))}
                      {ex.equipment.length > 0 && (
                        <span className="text-xs text-text-secondary">
                          {ex.equipment.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      onClick={() => toggleNotes(pe.id)}
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        'size-7',
                        hasNotes
                          ? 'text-primary bg-primary-soft'
                          : 'text-text-secondary',
                      )}
                      aria-label="Coaching notes"
                      title="Coaching notes"
                    >
                      <MessageSquare size={15} />
                    </Button>
                    <SwapVariantsPicker
                      planExercise={pe}
                      exercises={exercises}
                      onUpdate={(variants) =>
                        handleUpdateExerciseData(
                          pe.id,
                          'swapVariants',
                          variants,
                        )
                      }
                    />
                    <Button
                      onClick={() => handleRemoveExercise(pe.id)}
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-text-secondary hover:text-destructive hover:bg-destructive/10"
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                {/* Row 2: Sets / Reps / RIR inputs */}
                <div className="flex gap-3 pl-0">
                  <div className="flex flex-col">
                    <label className={cn(LABEL_CLASS, 'mb-1')}>Sets</label>
                    <Input
                      type="number"
                      size="sm"
                      value={pe.sets}
                      onChange={(e) =>
                        handleUpdateExerciseData(
                          pe.id,
                          'sets',
                          parseInt(e.target.value),
                        )
                      }
                      className="w-16 text-center"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className={cn(LABEL_CLASS, 'mb-1')}>Reps</label>
                    <Input
                      type="text"
                      size="sm"
                      value={pe.reps}
                      onChange={(e) =>
                        handleUpdateExerciseData(pe.id, 'reps', e.target.value)
                      }
                      className="w-24 text-center"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className={cn(LABEL_CLASS, 'mb-1')}>RIR</label>
                    <Input
                      type="number"
                      size="sm"
                      value={pe.rir}
                      onChange={(e) =>
                        handleUpdateExerciseData(
                          pe.id,
                          'rir',
                          parseInt(e.target.value),
                        )
                      }
                      className="w-16 text-center"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className={cn(LABEL_CLASS, 'mb-1')}>Rest</label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        size="sm"
                        value={pe.restSeconds || ''}
                        placeholder="--"
                        onChange={(e) =>
                          handleUpdateExerciseData(
                            pe.id,
                            'restSeconds',
                            parseInt(e.target.value) || undefined,
                          )
                        }
                        className="w-16 text-center"
                      />
                      <span className="text-xs text-text-secondary">sec</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes textarea */}
              <AnimatePresence>
                {isNotesOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      value={pe.notes || ''}
                      onChange={(e) =>
                        handleUpdateExerciseData(pe.id, 'notes', e.target.value)
                      }
                      placeholder="Add coaching notes (form cues, tempo, etc.)"
                      className="mt-2 min-h-[60px] bg-muted"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {isOver && (
        <div className="absolute inset-0 bg-primary-soft rounded-card flex items-center justify-center backdrop-blur-[1px] z-10 pointer-events-none">
          <div className="bg-card text-primary font-medium px-4 py-2 rounded-control shadow-raised flex items-center gap-2">
            <Plus size={18} /> Add to Superset
          </div>
        </div>
      )}
    </div>
  );
}

// ── Swap Variants Picker ────────────────────────────────────────────

function SwapVariantsPicker({
  planExercise,
  exercises,
  onUpdate,
}: {
  planExercise: PlanExercise;
  exercises: Exercise[];
  onUpdate: (variants: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const currentVariants = planExercise.swapVariants || [];
  const hasVariants = currentVariants.length > 0;

  const filteredExercises = exercises.filter(
    (ex) =>
      ex.id !== planExercise.exerciseId &&
      (ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.primaryMuscles.some((m) =>
          m.toLowerCase().includes(search.toLowerCase()),
        )),
  );

  const toggleVariant = (exerciseId: string) => {
    if (currentVariants.includes(exerciseId)) {
      onUpdate(currentVariants.filter((id) => id !== exerciseId));
    } else {
      onUpdate([...currentVariants, exerciseId]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'relative size-7',
            hasVariants
              ? 'text-primary bg-primary-soft'
              : 'text-text-secondary',
          )}
          aria-label="Swap variants"
          title="Swap variants"
        >
          <ArrowLeftRight size={15} />
          {hasVariants && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
              {currentVariants.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 px-3 border-b border-border rounded-field">
          <p className={cn(LABEL_CLASS, 'mb-2')}>Swap Variants</p>
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            size="sm"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-2 space-y-1">
          {filteredExercises.map((ex) => {
            const isSelected = currentVariants.includes(ex.id);
            return (
              <label
                key={ex.id}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-compact text-xs cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary-soft' : 'hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleVariant(ex.id)}
                  className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span
                  className={isSelected ? 'text-primary' : 'text-text-primary'}
                >
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-text-secondary ml-1">
                    {ex.primaryMuscles.join(', ')}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Props ─────────────────────────────────────────────────────────────

export interface PlanBuilderProps {
  /** Header center — rendered between the back button and the right-side actions */
  headerCenter: React.ReactNode;
  /** Header right side — action buttons (save, template picker, etc.) */
  headerRight: React.ReactNode;
  /** Extra content below "Add Week" in the left sidebar */
  sidebarFooterExtra?: React.ReactNode;
  /** Number of weeks that existed before this editing session (0 for new templates) */
  originalWeekCount?: number;
  /** Initial weeks to populate the builder with */
  initialWeeks: PlanWeek[];
  /** Callback to navigate back */
  onBack: () => void;
  /** Called whenever weeks change so the parent can track current state */
  onWeeksChange?: (weeks: PlanWeek[]) => void;
  /** Additional content rendered alongside the builder (e.g., template picker modal) */
  children?: React.ReactNode;
  /** ID prefix for generated element IDs (avoids collisions between modes) */
  idPrefix?: string;
}

// ── Shared PlanBuilder Component ──────────────────────────────────────

export function PlanBuilder({
  headerCenter,
  headerRight,
  sidebarFooterExtra,
  originalWeekCount = 0,
  initialWeeks,
  onBack,
  onWeeksChange,
  children,
  idPrefix = 'pb',
}: PlanBuilderProps) {
  const { exercises } = useTraining();

  // ── Core builder state ─────────────────────────────────────────────
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [selectedForSuperset, setSelectedForSuperset] = useState<string[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ExerciseFilter[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingClickSwallowRef = useRef<((click: MouseEvent) => void) | null>(
    null,
  );

  const stopSwallowingClicks = () => {
    const handler = pendingClickSwallowRef.current;
    if (!handler) return;
    document.removeEventListener('click', handler, { capture: true });
    pendingClickSwallowRef.current = null;
  };

  /**
   * Closing the popover on pointerdown is not enough on its own: the click that
   * follows still reaches whatever the popover was covering, and a library
   * card's quick-add sits right there — so dismissing the popover would add an
   * exercise the coach never asked for. This lives outside the open/close effect
   * because closing re-runs that effect's cleanup, which would unregister the
   * handler before the click ever arrived.
   */
  const swallowNextOutsideClick = () => {
    stopSwallowingClicks();
    const handler = (click: MouseEvent) => {
      click.preventDefault();
      click.stopPropagation();
      stopSwallowingClicks();
    };
    pendingClickSwallowRef.current = handler;
    document.addEventListener('click', handler, { capture: true });
    // A press that never becomes a click (a drag, a scroll) must not leave this
    // armed to eat an unrelated click later.
    window.setTimeout(stopSwallowingClicks, 300);
  };

  useEffect(() => stopSwallowingClicks, []);

  // Week action dropdown
  const [openWeekAction, setOpenWeekAction] = useState<number | null>(null);

  // Drawer state (responsive slide-overs)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // ── Initialize from props ──────────────────────────────────────────
  useEffect(() => {
    if (initialWeeks.length > 0) {
      setWeeks(initialWeeks);
      setActiveWeekIdx(0);
      setActiveDayIdx(0);
      setSelectedForSuperset([]);
    }
  }, [initialWeeks]);

  // ── Notify parent of week changes ──────────────────────────────────
  useEffect(() => {
    if (onWeeksChange && weeks.length > 0) {
      onWeeksChange(weeks);
    }
  }, [weeks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notes toggle ───────────────────────────────────────────────────
  const toggleNotes = (peId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(peId)) next.delete(peId);
      else next.add(peId);
      return next;
    });
  };

  // ── Derived ────────────────────────────────────────────────────────
  const activeWeek = weeks[activeWeekIdx];
  const activeDay = activeWeek?.days[activeDayIdx];

  const groupedExercises = useMemo(() => {
    if (!activeDay) return [];
    const groups: { id: string; isSuperset: boolean; items: PlanExercise[] }[] =
      [];
    const processedIds = new Set<string>();
    activeDay.exercises.forEach((pe) => {
      if (processedIds.has(pe.id)) return;
      if (pe.supersetId) {
        const ssItems = activeDay.exercises.filter(
          (e) => e.supersetId === pe.supersetId,
        );
        groups.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
        ssItems.forEach((i) => processedIds.add(i.id));
      } else {
        groups.push({ isSuperset: false, id: pe.id, items: [pe] });
        processedIds.add(pe.id);
      }
    });
    return groups;
  }, [activeDay]);

  const filteredLibrary = useMemo(
    () =>
      exercises.filter((exercise) =>
        matchesExerciseFilters({ exercise, searchQuery, activeFilters }),
      ),
    [exercises, searchQuery, activeFilters],
  );

  // The popover overlays the results it filters, so a coach who has finished with
  // it needs the two ways out they will reach for first.
  useEffect(() => {
    if (!isFilterOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (filterPopoverRef.current?.contains(target)) return;
      if (filterTriggerRef.current?.contains(target)) return;
      swallowNextOutsideClick();
      setIsFilterOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const focusWasInside = filterPopoverRef.current?.contains(
        document.activeElement,
      );
      setIsFilterOpen(false);
      if (focusWasInside) filterTriggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFilterOpen]);

  const toggleFilter = (filter: ExerciseFilter) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  // ── Week / Day manipulation ────────────────────────────────────────

  const updateActiveDayExercises = (newExercises: PlanExercise[]) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return { ...day, exercises: newExercises };
          }),
        };
      }),
    );
  };

  const handleUpdateDayType = (type: DayType) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return {
              ...day,
              type,
              exercises: type === 'Rest' ? [] : day.exercises,
            };
          }),
        };
      }),
    );
  };

  const handleAddWeek = () => {
    const newOrder = weeks.length + 1;
    const ts = Date.now();
    const newWeek: PlanWeek = {
      id: `${idPrefix}-w-${ts}-${Math.random().toString(36).slice(2)}`,
      order: newOrder,
      isDeload: false,
      days: Array.from({ length: 7 }).map((_, j) => ({
        id: `${idPrefix}-d-${ts}-${j}-${Math.random().toString(36).slice(2)}`,
        dayOfWeek: j,
        type: 'Rest' as DayType,
        exercises: [],
      })),
    };
    setWeeks([...weeks, newWeek]);
    setActiveWeekIdx(weeks.length);
    setActiveDayIdx(0);
    toast.success(`Week ${newOrder} added`);
  };

  const handleRemoveWeek = (wIdx: number) => {
    if (weeks.length <= 1) {
      toast.error('Plan must have at least 1 week');
      return;
    }
    if (originalWeekCount > 0 && wIdx < originalWeekCount) {
      toast.error('Cannot remove existing plan weeks');
      return;
    }
    const newWeeks = weeks
      .filter((_, i) => i !== wIdx)
      .map((w, i) => ({ ...w, order: i + 1 }));
    setWeeks(newWeeks);
    if (activeWeekIdx >= newWeeks.length) {
      setActiveWeekIdx(newWeeks.length - 1);
    }
    setOpenWeekAction(null);
  };

  const deepCopyWeekDays = (sourceDays: PlanDay[]) => {
    const copied: PlanDay[] = JSON.parse(JSON.stringify(sourceDays));
    const ssMap = new Map<string, string>();
    copied.forEach((d) => {
      d.id = `${idPrefix}-d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      d.exercises.forEach((e) => {
        e.id = `${idPrefix}-pe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (e.supersetId) {
          if (!ssMap.has(e.supersetId)) {
            ssMap.set(
              e.supersetId,
              `${idPrefix}-ss-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            );
          }
          e.supersetId = ssMap.get(e.supersetId);
        }
      });
    });
    return copied;
  };

  const handleCopyWeek = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    setWeeks((prev) => {
      const w = [...prev];
      w[targetIdx] = {
        ...w[targetIdx],
        days: deepCopyWeekDays(w[sourceIdx].days),
      };
      return w;
    });
    toast.success(`Copied Week ${sourceIdx + 1} to Week ${targetIdx + 1}`);
    setOpenWeekAction(null);
  };

  const handleApplyWeekToAll = (sourceIdx: number) => {
    setWeeks((prev) => {
      const w = [...prev];
      for (let i = 0; i < w.length; i++) {
        if (i === sourceIdx) continue;
        w[i] = { ...w[i], days: deepCopyWeekDays(w[sourceIdx].days) };
      }
      return w;
    });
    toast.success(`Week ${sourceIdx + 1} applied to all weeks`);
  };

  const handleSwapWeek = (idxA: number, idxB: number) => {
    if (idxA === idxB) return;
    setWeeks((prev) => {
      const w = [...prev];
      const tempDays = w[idxA].days;
      w[idxA] = { ...w[idxA], days: w[idxB].days };
      w[idxB] = { ...w[idxB], days: tempDays };
      return w;
    });
    toast.success(`Swapped Week ${idxA + 1} and Week ${idxB + 1}`);
    setOpenWeekAction(null);
  };

  const toggleDeload = (wIdx: number) => {
    setWeeks((prev) =>
      prev.map((week, i) =>
        i === wIdx ? { ...week, isDeload: !week.isDeload } : week,
      ),
    );
  };

  // ── Drag-drop handlers ─────────────────────────────────────────────

  const handleDropOnSeparator = (dragItem: any, targetIndex: number) => {
    let newGroups = [...groupedExercises];

    if (dragItem.type === 'LIBRARY_EXERCISE') {
      const newPe: PlanExercise = {
        id: `${idPrefix}-pe-${Date.now()}`,
        exerciseId: dragItem.exercise.id,
        sets: 3,
        reps: '10',
        rir: 2,
      };
      newGroups.splice(targetIndex, 0, {
        id: newPe.id,
        isSuperset: false,
        items: [newPe],
      });
    } else if (dragItem.type === 'PLAN_EXERCISE') {
      const oldIndex = newGroups.findIndex((g) => g.id === dragItem.id);
      if (oldIndex === -1) return;
      const [movedGroup] = newGroups.splice(oldIndex, 1);
      let finalIndex = targetIndex;
      if (oldIndex < targetIndex) finalIndex -= 1;
      newGroups.splice(finalIndex, 0, movedGroup);
    }

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleDropOnGroup = (dragItem: any, targetGroupId: string) => {
    let newGroups = [...groupedExercises];
    const targetGroup = newGroups.find((g) => g.id === targetGroupId);
    if (!targetGroup) return;
    if (dragItem.id === targetGroupId) return;

    let draggedItems: PlanExercise[] = [];

    if (dragItem.type === 'LIBRARY_EXERCISE') {
      draggedItems = [
        {
          id: `${idPrefix}-pe-${Date.now()}`,
          exerciseId: dragItem.exercise.id,
          sets: 3,
          reps: '10',
          rir: 2,
        },
      ];
    } else if (dragItem.type === 'PLAN_EXERCISE') {
      const oldIndex = newGroups.findIndex((g) => g.id === dragItem.id);
      if (oldIndex === -1) return;
      const [movedGroup] = newGroups.splice(oldIndex, 1);
      draggedItems = movedGroup.items;
    }

    if (!targetGroup.isSuperset) {
      targetGroup.isSuperset = true;
      targetGroup.id = `${idPrefix}-ss-${Date.now()}`;
      targetGroup.items.forEach((pe) => (pe.supersetId = targetGroup.id));
    }

    draggedItems.forEach((pe) => {
      pe.supersetId = targetGroup.id;
      targetGroup.items.push(pe);
    });

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleRemoveExercise = (peId: string) => {
    const newGroups = [...groupedExercises];
    for (let i = 0; i < newGroups.length; i++) {
      const g = newGroups[i];
      const peIdx = g.items.findIndex((pe) => pe.id === peId);
      if (peIdx !== -1) {
        g.items.splice(peIdx, 1);
        if (g.items.length === 0) {
          newGroups.splice(i, 1);
        } else if (g.isSuperset && g.items.length === 1) {
          g.items[0].supersetId = undefined;
          newGroups[i] = {
            id: g.items[0].id,
            isSuperset: false,
            items: g.items,
          };
        }
        break;
      }
    }
    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
    setSelectedForSuperset((prev) => prev.filter((id) => id !== peId));
  };

  const handleRemoveSuperset = (supersetId: string) => {
    const newGroups = [...groupedExercises];
    const idx = newGroups.findIndex((g) => g.id === supersetId);
    if (idx === -1) return;
    const group = newGroups[idx];
    const newIndividualGroups = group.items.map((pe) => {
      pe.supersetId = undefined;
      return { id: pe.id, isSuperset: false, items: [pe] };
    });
    newGroups.splice(idx, 1, ...newIndividualGroups);
    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
  };

  const handleUpdateExerciseData = (
    peId: string,
    field: keyof PlanExercise,
    value: any,
  ) => {
    setWeeks((prev) =>
      prev.map((week, wIdx) => {
        if (wIdx !== activeWeekIdx) return week;
        return {
          ...week,
          days: week.days.map((day, dIdx) => {
            if (dIdx !== activeDayIdx) return day;
            return {
              ...day,
              exercises: day.exercises.map((pe) =>
                pe.id === peId ? { ...pe, [field]: value } : pe,
              ),
            };
          }),
        };
      }),
    );
  };

  const handleGroupSuperset = () => {
    if (selectedForSuperset.length < 2) return;
    const supersetId = `${idPrefix}-ss-${Date.now()}`;
    const newGroups = [...groupedExercises];
    const itemsToGroup: PlanExercise[] = [];

    for (let i = newGroups.length - 1; i >= 0; i--) {
      const g = newGroups[i];
      const selected = g.items.filter((pe) =>
        selectedForSuperset.includes(pe.id),
      );
      const kept = g.items.filter((pe) => !selectedForSuperset.includes(pe.id));

      itemsToGroup.unshift(...selected);

      if (kept.length === 0) {
        newGroups.splice(i, 1);
      } else {
        if (g.isSuperset && kept.length === 1) {
          kept[0].supersetId = undefined;
          newGroups[i] = { id: kept[0].id, isSuperset: false, items: kept };
        } else {
          newGroups[i] = { ...g, items: kept };
        }
      }
    }

    itemsToGroup.forEach((pe) => (pe.supersetId = supersetId));
    newGroups.push({ id: supersetId, isSuperset: true, items: itemsToGroup });

    updateActiveDayExercises(newGroups.flatMap((g) => g.items));
    setSelectedForSuperset([]);
    toast.success('Superset created!');
  };

  const handleQuickAdd = (exercise: Exercise) => {
    if (!activeDay || activeDay.type === 'Rest') {
      toast.error('Set a training day type first');
      return;
    }
    const newPe: PlanExercise = {
      id: `${idPrefix}-pe-${Date.now()}`,
      exerciseId: exercise.id,
      sets: 3,
      reps: '10',
      rir: 2,
    };
    updateActiveDayExercises([...activeDay.exercises, newPe]);
    toast.success(`Added ${exercise.name}`);
  };

  // ── Checks ─────────────────────────────────────────────────────────

  const activeWeekHasContent = activeWeek?.days.some(
    (d) => d.type !== 'Rest' && d.exercises.length > 0,
  );

  if (!activeDay && weeks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-4 text-text-secondary" />
          <h2 className="text-xl font-medium text-text-primary mb-2">
            Loading...
          </h2>
          <p className="text-text-secondary mb-6">
            Preparing the plan builder.
          </p>
        </div>
      </div>
    );
  }

  if (!activeDay) return null;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <CustomDragLayer />
      {/* Full-screen takeover -- no coach sidebar */}
      <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="h-14 px-4 lg:px-6 border-b border-border rounded-field bg-card flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </Button>
            {/* Plan structure toggle -- visible on small screens only */}
            <Button
              onClick={() => {
                setLeftDrawerOpen(true);
                setRightDrawerOpen(false);
              }}
              variant="ghost"
              size="icon-sm"
              className="xl:hidden shrink-0"
              aria-label="Plan Structure"
              title="Plan Structure"
            >
              <PanelLeftOpen size={20} />
            </Button>
            {headerCenter}
          </div>
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Exercise library toggle -- visible on small screens only */}
            <Button
              onClick={() => {
                setRightDrawerOpen(true);
                setLeftDrawerOpen(false);
              }}
              variant="ghost"
              size="icon-sm"
              className="xl:hidden"
              aria-label="Exercise Library"
              title="Exercise Library"
            >
              <Library size={20} />
            </Button>
            {headerRight}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Backdrop for drawers on small screens */}
          <AnimatePresence>
            {(leftDrawerOpen || rightDrawerOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="xl:hidden fixed inset-0 bg-black/30 z-40"
                onClick={() => {
                  setLeftDrawerOpen(false);
                  setRightDrawerOpen(false);
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Left Sidebar: Plan Structure ── */}
          <div
            className={`bg-card border-r border-border flex flex-col shrink-0 transition-transform duration-300 ease-out ${
              leftDrawerOpen
                ? 'fixed inset-y-0 left-0 z-50 w-80 shadow-2xl translate-x-0'
                : 'fixed inset-y-0 left-0 z-50 w-80 -translate-x-full xl:translate-x-0 xl:relative xl:w-72 xl:shadow-none'
            }`}
          >
            {/* Drawer close button -- small screens only */}
            <div className="xl:hidden flex items-center justify-between px-4 py-3 border-b border-border rounded-field">
              <span className={LABEL_CLASS}>Plan Structure</span>
              <Button
                onClick={() => setLeftDrawerOpen(false)}
                variant="ghost"
                size="icon-sm"
                className="size-8"
                aria-label="Close"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="p-4 px-3 border-b border-border rounded-field">
              <h2 className={LABEL_CLASS}>Plan Structure</h2>
              {originalWeekCount > 0 && (
                <p className="text-xs text-text-secondary mt-1">
                  {originalWeekCount} existing{' '}
                  {originalWeekCount === 1 ? 'week' : 'weeks'}
                  {weeks.length > originalWeekCount &&
                    ` + ${weeks.length - originalWeekCount} new`}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {weeks.map((week, wIdx) => {
                const isExistingWeek =
                  originalWeekCount > 0 && wIdx < originalWeekCount;
                const isNewWeek =
                  originalWeekCount > 0 && wIdx >= originalWeekCount;

                return (
                  <div
                    key={week.id}
                    className="px-3 border-b border-border rounded-field"
                  >
                    <div
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors group relative ${
                        activeWeekIdx === wIdx ? 'bg-muted' : ''
                      } ${isNewWeek ? 'border-l-[3px] border-l-primary' : ''}`}
                      onClick={() => setActiveWeekIdx(wIdx)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text-primary">
                          Week {week.order}
                        </span>
                        {week.isDeload && (
                          <Badge tone="brand-secondary">Deload</Badge>
                        )}
                        {isExistingWeek && (
                          <Badge tone="muted">Existing</Badge>
                        )}
                        {isNewWeek && (
                          <Badge
                            tone="outline"
                            className="border-primary/20 bg-primary-soft text-primary"
                          >
                            New
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Copy Week */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              onClick={(e) => e.stopPropagation()}
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 text-text-secondary hover:text-accent-foreground hover:bg-accent"
                              aria-label="Copy week"
                              title="Copy week"
                            >
                              <Copy size={14} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-52 p-2 bg-card border border-border rounded-control shadow-xl z-50"
                          >
                            <p className={cn(LABEL_CLASS, 'px-2 py-1.5')}>
                              Copy Week {wIdx + 1} to:
                            </p>
                            <div className="space-y-0.5 max-h-40 overflow-y-auto">
                              {weeks.map(
                                (_, i) =>
                                  i !== wIdx && (
                                    <Button
                                      key={i}
                                      type="button"
                                      onClick={() => handleCopyWeek(wIdx, i)}
                                      variant="ghost"
                                      size="xs"
                                      className="w-full justify-start px-3 text-sm font-normal text-text-primary"
                                    >
                                      Week {i + 1}
                                    </Button>
                                  ),
                              )}
                            </div>
                            {weeks.length > 2 && (
                              <div className="border-t border-border mt-1 pt-1">
                                <Button
                                  type="button"
                                  onClick={() => handleApplyWeekToAll(wIdx)}
                                  variant="ghost"
                                  size="xs"
                                  className="w-full justify-start px-3 text-sm font-semibold text-primary hover:bg-accent hover:text-accent-foreground"
                                >
                                  Apply to All Weeks
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>

                        {/* Toggle deload */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDeload(wIdx);
                          }}
                          aria-label="Toggle Deload"
                          title="Toggle Deload"
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            'size-7',
                            week.isDeload
                              ? 'text-brand-secondary bg-brand-secondary-soft'
                              : 'text-text-secondary opacity-0 group-hover:opacity-100',
                          )}
                        >
                          <Info size={14} />
                        </Button>

                        {/* More actions */}
                        <div className="relative">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenWeekAction(
                                openWeekAction === wIdx ? null : wIdx,
                              );
                            }}
                            variant="ghost"
                            size="icon-sm"
                            className="size-7 text-text-secondary opacity-0 group-hover:opacity-100"
                            aria-label="More week actions"
                          >
                            <MoreVertical size={14} />
                          </Button>

                          <AnimatePresence>
                            {openWeekAction === wIdx && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-8 w-48 bg-card rounded-control shadow-xl border border-border py-1 z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className={cn(
                                    LABEL_CLASS,
                                    'px-3 py-2 border-b border-border rounded-field',
                                  )}
                                >
                                  Swap With...
                                </div>
                                <div className="max-h-32 overflow-y-auto">
                                  {weeks.map(
                                    (_, i) =>
                                      i !== wIdx && (
                                        <Button
                                          key={`swap-${i}`}
                                          type="button"
                                          onClick={() =>
                                            handleSwapWeek(wIdx, i)
                                          }
                                          variant="ghost"
                                          size="xs"
                                          className="w-full justify-start px-4 text-sm font-normal text-text-primary"
                                        >
                                          <ArrowLeftRight
                                            size={14}
                                            className="text-text-secondary"
                                          />{' '}
                                          Week {i + 1}
                                        </Button>
                                      ),
                                  )}
                                </div>
                                {/* Show delete only when allowed: template mode (originalWeekCount===0) always, client mode only for new weeks */}
                                {(originalWeekCount === 0 || isNewWeek) && (
                                  <div className="border-t border-border mt-1">
                                    <Button
                                      type="button"
                                      onClick={() => handleRemoveWeek(wIdx)}
                                      variant="ghost"
                                      size="xs"
                                      className="w-full justify-start px-4 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 size={14} /> Delete Week
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Day list (expanded for active week) */}
                    {activeWeekIdx === wIdx && (
                      <div className="px-3 pb-3 space-y-1">
                        {DAY_NAMES.map((dName, dIdx) => {
                          const day = week.days[dIdx];
                          const isActive = activeDayIdx === dIdx;
                          const exCount = day.exercises.length;
                          return (
                            <Button
                              key={dIdx}
                              type="button"
                              onClick={() => setActiveDayIdx(dIdx)}
                              variant="ghost"
                              size="xs"
                              className={cn(
                                'w-full justify-between px-3 text-sm',
                                isActive
                                  ? 'bg-active-surface font-semibold text-primary-foreground hover:bg-active-surface hover:text-primary-foreground'
                                  : 'font-normal text-text-secondary',
                              )}
                            >
                              <span className="flex items-center gap-1.5">
                                {dName}
                                {day.type !== 'Rest' && exCount > 0 && (
                                  <Badge tone="count">{exCount}</Badge>
                                )}
                                {day.type !== 'Rest' && exCount === 0 && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-status-pending shrink-0"
                                    title="No exercises yet"
                                  />
                                )}
                              </span>
                              <Badge
                                tone="outline"
                                className={getDayTypeBadgeClass(day.type)}
                              >
                                {day.type !== 'Rest' && day.type}
                              </Badge>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-muted shrink-0 space-y-2">
              <Button
                onClick={handleAddWeek}
                variant="outline"
                className="w-full shadow-card"
              >
                <Plus size={16} /> Add Week
              </Button>
              {sidebarFooterExtra}
            </div>
          </div>

          {/* ── Middle Content: Day Builder ─────────────────────── */}
          <div className="flex-1 flex flex-col bg-surface-page overflow-hidden min-w-0">
            {/* Week overview bar */}
            <div className="p-4 pb-2 px-3 border-b border-border rounded-field bg-card shrink-0">
              {/* Week pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {weeks.map((week, wIdx) => {
                  const isNewWeek =
                    originalWeekCount > 0 && wIdx >= originalWeekCount;
                  return (
                    <Button
                      key={week.id}
                      type="button"
                      onClick={() => setActiveWeekIdx(wIdx)}
                      variant={activeWeekIdx === wIdx ? 'primary' : 'outline'}
                      className={cn(
                        'h-auto shrink-0 flex-col gap-1.5 border px-3 py-2 relative',
                        activeWeekIdx === wIdx
                          ? 'border-primary shadow-card'
                          : 'border-border bg-card text-text-secondary hover:border-muted-foreground/30',
                      )}
                    >
                      {isNewWeek && activeWeekIdx !== wIdx && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                      <span className="text-xs font-semibold whitespace-nowrap">
                        W{week.order}
                        {week.isDeload && (
                          <span className="ml-1 opacity-70">D</span>
                        )}
                      </span>
                      {/* Day dots */}
                      <div className="flex gap-[3px]">
                        {week.days.map((day, dIdx) => {
                          const color = getDayTypeColor(day.type);
                          const hasExercises = day.exercises.length > 0;
                          const isActiveDay =
                            activeWeekIdx === wIdx && activeDayIdx === dIdx;
                          return (
                            <button
                              key={dIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveWeekIdx(wIdx);
                                setActiveDayIdx(dIdx);
                              }}
                              className="relative"
                              title={`${DAY_NAMES[dIdx]} - ${day.type}`}
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                  isActiveDay
                                    ? 'ring-2 ring-offset-1 ring-primary'
                                    : ''
                                }`}
                                style={{
                                  backgroundColor:
                                    hasExercises || day.type === 'Rest'
                                      ? color
                                      : 'transparent',
                                  border:
                                    !hasExercises && day.type !== 'Rest'
                                      ? `2px solid ${color}`
                                      : 'none',
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Current day heading + type selector */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-text-primary">
                  {DAY_NAMES_FULL[activeDayIdx]}
                  {originalWeekCount > 0 && (
                    <span className="ml-3 text-sm font-normal text-text-secondary">
                      Week {activeWeek?.order}
                      {activeWeek && activeWeekIdx >= originalWeekCount && (
                        <Badge
                          tone="outline"
                          className="ml-2 border-primary/20 bg-primary-soft text-primary"
                        >
                          New
                        </Badge>
                      )}
                    </span>
                  )}
                </h3>
                {activeWeekHasContent && weeks.length > 1 && (
                  <Button
                    onClick={() => handleApplyWeekToAll(activeWeekIdx)}
                    variant="outline"
                    size="xs"
                    className="text-primary border-primary/20 hover:bg-primary-soft"
                  >
                    <Layers size={14} />
                    Apply week to all
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {DAY_TYPES.map((type) => {
                  const isSelected = activeDay.type === type;
                  return (
                    <Button
                      key={type}
                      type="button"
                      onClick={() => handleUpdateDayType(type)}
                      variant={isSelected ? 'primary' : 'outline'}
                      size="xs"
                      className={cn(
                        'rounded-full border px-4 text-sm font-semibold',
                        isSelected
                          ? 'border-primary shadow-card'
                          : 'border-border bg-card text-text-secondary hover:border-muted-foreground/30 hover:text-text-primary',
                      )}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Exercise list area */}
            <div className="flex-1 overflow-y-auto relative">
              {activeWeek?.isDeload && (
                <div className="mx-8 mt-8 bg-brand-secondary-soft border border-brand-secondary/20 rounded-card p-5 flex items-start gap-4 shadow-card">
                  <Info
                    className="text-brand-secondary shrink-0 mt-0.5"
                    size={24}
                  />
                  <div>
                    <h4 className="text-brand-secondary font-medium text-base">
                      Deload Week
                    </h4>
                    <p className="text-sm text-text-secondary mt-1">
                      This is a planned deload week. Consider reducing sets,
                      lowering reps, or increasing RIR to prioritize recovery.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-8 max-w-4xl mx-auto h-full">
                {activeDay.type === 'Rest' ? (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      icon={Activity}
                      title="Rest Day"
                      description="Enjoy the recovery. No exercises for this day."
                    />
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col min-h-full">
                    {/* Superset selection bar */}
                    {selectedForSuperset.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card p-4 rounded-control border border-primary shadow-raised flex items-center justify-between mb-6 sticky top-4 z-20"
                      >
                        <span className="text-sm font-medium text-primary">
                          {selectedForSuperset.length} exercises selected
                        </span>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => setSelectedForSuperset([])}
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleGroupSuperset}
                            variant="primary"
                            className="shadow-card"
                          >
                            Create Superset
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {groupedExercises.length === 0 ? (
                      <EmptyDropTarget
                        onDrop={(item: any) => handleDropOnSeparator(item, 0)}
                      />
                    ) : (
                      <>
                        <DropSeparator
                          index={0}
                          onDrop={handleDropOnSeparator}
                        />
                        {groupedExercises.map((group, gIdx) => {
                          const baseIndex = groupedExercises
                            .slice(0, gIdx)
                            .reduce((sum, g) => sum + g.items.length, 0);
                          const isLast = gIdx === groupedExercises.length - 1;
                          return (
                            <React.Fragment key={group.id}>
                              <PlanGroupCard
                                group={{ ...group, baseIndex }}
                                onDropOnGroup={handleDropOnGroup}
                                handleRemoveExercise={handleRemoveExercise}
                                handleUpdateExerciseData={
                                  handleUpdateExerciseData
                                }
                                handleRemoveSuperset={handleRemoveSuperset}
                                exercises={exercises}
                                selectedForSuperset={selectedForSuperset}
                                toggleSelectForSuperset={(id: string) => {
                                  if (selectedForSuperset.includes(id))
                                    setSelectedForSuperset((prev) =>
                                      prev.filter((p) => p !== id),
                                    );
                                  else
                                    setSelectedForSuperset((prev) => [
                                      ...prev,
                                      id,
                                    ]);
                                }}
                                expandedNotes={expandedNotes}
                                toggleNotes={toggleNotes}
                              />
                              {isLast ? (
                                <DropSeparator
                                  index={gIdx + 1}
                                  onDrop={handleDropOnSeparator}
                                  isTrailing
                                />
                              ) : (
                                <DropSeparator
                                  index={gIdx + 1}
                                  onDrop={handleDropOnSeparator}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Sidebar: Exercise Library ── */}
          <div
            className={`bg-card border-l border-border flex flex-col shrink-0 z-10 transition-transform duration-300 ease-out ${
              rightDrawerOpen
                ? 'fixed inset-y-0 right-0 z-50 w-80 shadow-2xl translate-x-0'
                : 'fixed inset-y-0 right-0 z-50 w-80 translate-x-full xl:translate-x-0 xl:relative xl:w-80 xl:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]'
            }`}
          >
            <div className="p-4 px-3 border-b border-border rounded-field bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className={LABEL_CLASS}>Exercise Library</h3>
                <Button
                  onClick={() => setRightDrawerOpen(false)}
                  variant="ghost"
                  size="icon-sm"
                  className="xl:hidden size-8"
                  aria-label="Close"
                >
                  <X size={18} />
                </Button>
              </div>
              <SearchField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercises..."
                size="sm"
                className="mb-3"
              />

              <div className="relative">
                <Button
                  ref={filterTriggerRef}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  aria-expanded={isFilterOpen}
                  variant="outline"
                  className="w-full justify-between bg-muted font-medium text-text-secondary"
                >
                  <div className="flex items-center gap-2">
                    <Filter size={16} />
                    <span>
                      Filters{' '}
                      {activeFilters.length > 0 && `(${activeFilters.length})`}
                    </span>
                  </div>
                </Button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      ref={filterPopoverRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-xl rounded-control p-3 z-50"
                    >
                      <ExerciseFilters
                        activeFilters={activeFilters}
                        onToggleFilter={toggleFilter}
                        onClearFilters={clearFilters}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-page">
              {filteredLibrary.map((ex) => (
                <LibraryExerciseCard
                  key={ex.id}
                  ex={ex}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
              {filteredLibrary.length === 0 && (
                <EmptyState
                  icon={Search}
                  title="No exercises match your search and filters."
                  description="Try a different search term or clear your filters."
                  action={
                    (activeFilters.length > 0 || Boolean(searchQuery)) && (
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={clearFilters}
                      >
                        Clear search and filters
                      </Button>
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {children}
    </DndProvider>
  );
}
