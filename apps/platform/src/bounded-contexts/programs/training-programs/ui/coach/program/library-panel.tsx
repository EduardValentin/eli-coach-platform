import { GripVertical, Plus } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { useDrag } from "react-dnd";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "~/shared/design-system/overlays";
import { EmptyState } from "~/shared/design-system/portal";
import { cn, WIDGET_TITLE_CLASS } from "~/shared/design-system/lib";
import {
  Badge,
  Button,
  FieldTrigger,
  MultiSelect,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RemovableChip,
  SearchField,
  Switch,
} from "~/shared/design-system/primitives";

import {
  LibrarySelection,
  MOVEMENT_PATTERNS,
  MUSCLES,
  type ActiveFilter,
  type Equipment,
  type LibraryExercise,
  type LibraryPickRefusal,
  type LibraryType,
  type Muscle,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { ExerciseNameButton } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-name-button";
import { exerciseDetailOf } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail-content";
import {
  counted,
  musclesAndEquipmentText,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";

import { useEditorAnnouncer } from "./editor-announcer";
import { IconActionButton } from "./icon-action-button";
import { MOVEMENT_PATTERN_LABELS } from "./movement-pattern-labels";
import { OptionSelect } from "./option-select";
import { LIBRARY_EXERCISE, type LibraryItem } from "./session-dnd";
import { usePendingFocus } from "./use-pending-focus";
import type { LibraryPurpose } from "./use-library-panel";

type LibraryPresentation = "pane" | "drawer";

type LibraryPanelProps = {
  presentation: LibraryPresentation;
  purpose: LibraryPurpose | null;
  libraryExercises: readonly LibraryExercise[];
  libraryEquipment: readonly Equipment[];
  searchRef: RefObject<HTMLInputElement | null>;
  onAdd: (exercise: LibraryExercise) => LibraryPickRefusal | undefined;
  onClose: () => void;
  onDrawerCloseAutoFocus?: (event: Event) => void;
};

const REFUSED_ADD_TEXT: Readonly<
  Record<LibraryPickRefusal, (name: string) => string>
> = {
  "warm-up-full": (name) =>
    `${name} not added: the warm-up holds four exercises`,
  "already-in-warm-up": (name) => `${name} is already in the warm-up`,
  "already-in-cool-down": (name) => `${name} is already in the cool-down`,
  "own-substitution": (name) => `${name} can’t be its own substitution`,
  "already-a-substitution": (name) =>
    `${name} is already one of its substitutions`,
  "substitutions-full": (name) =>
    `${name} not added: an exercise holds two substitutions`,
};

type ChangeSelection = (
  update: (current: LibrarySelection) => LibrarySelection,
) => void;

const MUSCLE_LABELS = Object.fromEntries(
  MUSCLES.map((muscle): [Muscle, string] => [muscle, muscle]),
) as Record<Muscle, string>;

const TYPE_OPTIONS: { value: LibraryType; label: string }[] = [
  { value: "resistance", label: "Resistance" },
  { value: "mobility", label: "Mobility" },
  { value: "stretching", label: "Stretching" },
  { value: "cardio", label: "Cardio" },
];

const COUNT_ANNOUNCE_DELAY_MS = 600;

function filterKey(filter: ActiveFilter): string {
  if (filter.kind === "pattern") return `pattern-${filter.pattern}`;
  if (filter.kind === "muscle") return `muscle-${filter.muscle}`;

  return filter.kind;
}

function filterLabel(filter: ActiveFilter): string {
  if (filter.kind === "search") return `Search: “${filter.query}”`;
  if (filter.kind === "pattern") {
    return `Pattern: ${MOVEMENT_PATTERN_LABELS[filter.pattern]}`;
  }
  if (filter.kind === "muscle") return `Muscle: ${filter.muscle}`;
  if (filter.kind === "only-her-equipment") return "Only her equipment";

  return "Bodyweight";
}

function useCountAnnouncement(count: number, selection: LibrarySelection) {
  const announce = useEditorAnnouncer();
  const firstRender = useRef(true);
  const pending = useRef<number>(undefined);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;

      return;
    }
    pending.current = window.setTimeout(
      () =>
        announce(
          count === 0 ? "No exercises match" : counted(count, "exercise"),
        ),
      COUNT_ANNOUNCE_DELAY_MS,
    );

    return () => window.clearTimeout(pending.current);
  }, [announce, count, selection]);

  return { cancelPending: () => window.clearTimeout(pending.current) };
}

type LibraryExerciseCardProps = {
  exercise: LibraryExercise;
  onAdd: (exercise: LibraryExercise) => void;
};

function LibraryExerciseCard({ exercise, onAdd }: LibraryExerciseCardProps) {
  const [{ isDragging }, drag] = useDrag<
    LibraryItem,
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: LIBRARY_EXERCISE,
      item: { exercise },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [exercise],
  );
  const facts = musclesAndEquipmentText(exercise);

  return (
    <div
      className={cn(
        "group grid cursor-grab touch-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-control border bg-surface-base p-3 select-none hover:shadow-card active:cursor-grabbing motion-reduce:transition-none motion-safe:transition-shadow",
        {
          "border-primary opacity-50": isDragging,
          "border-border-default": !isDragging,
        },
      )}
      ref={drag as unknown as Ref<HTMLDivElement>}
    >
      <ExerciseNameButton
        detail={exerciseDetailOf(exercise, {
          targets: [],
          cues: exercise.cues,
        })}
        exercise={exercise}
        size="compact"
        weight="medium"
      />
      <span className="flex items-center gap-6">
        <IconActionButton
          hint="Add exercise"
          icon={Plus}
          label={`Add ${exercise.name}`}
          onClick={() => onAdd(exercise)}
        />
        <GripVertical
          aria-hidden="true"
          className="text-text-secondary group-hover:text-primary"
          size={16}
        />
      </span>
      {facts && (
        <p className="col-span-2 text-sm break-words text-text-secondary">
          {facts}
        </p>
      )}
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
  const label = TYPE_OPTIONS.find((option) => option.value === type)?.label;
  const kind = `${label?.toLowerCase()} exercises`;
  if (filters.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-text-secondary">{`No ${kind} yet.`}</p>
    );
  }

  return (
    <EmptyState
      action={
        <div className="grid justify-items-start gap-6">
          <ul
            aria-label="Active filters"
            className="flex flex-wrap gap-x-2 gap-y-6"
            data-active-filters=""
          >
            {filters.map((filter, index) => (
              <RemovableChip
                key={filterKey(filter)}
                label={filterLabel(filter)}
                onRemove={() => onRemove(filter, index)}
                removeLabel={`Remove filter ${filterLabel(filter)}`}
              />
            ))}
          </ul>
          <Button onClick={onClear} size="xs" variant="outline">
            Clear filters
          </Button>
        </div>
      }
      density="compact"
      description={`No ${kind} match these filters. Remove one to see more.`}
      title="No matches"
    />
  );
}

type SwitchRowProps = {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
};

function SwitchRow({ label, checked, onCheckedChange }: SwitchRowProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-text-primary">
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      {label}
    </label>
  );
}

type FiltersPopoverProps = {
  selection: LibrarySelection;
  activeCount: number;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onChange: ChangeSelection;
};

function FiltersPopover({
  selection,
  activeCount,
  triggerRef,
  onChange,
}: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);

  function clear() {
    onChange((current) => current.withPanelFiltersCleared());
    setOpen(false);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <FieldTrigger
          aria-label={
            activeCount === 0 ? "Filters" : `Filters, ${activeCount} active`
          }
          ref={triggerRef}
        >
          <span data-slot="select-value">
            Filters
            {activeCount > 0 && <Badge tone="count">{activeCount}</Badge>}
          </span>
        </FieldTrigger>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Filters"
        className="grid gap-4"
        collisionPadding={16}
      >
        <div className="grid gap-2">
          {selection.type === "resistance" && (
            <MultiSelect
              label="Pattern"
              labels={MOVEMENT_PATTERN_LABELS}
              onToggle={(pattern) =>
                onChange((current) => current.withPatternToggled(pattern))
              }
              options={MOVEMENT_PATTERNS}
              selected={selection.patterns}
            />
          )}
          <MultiSelect
            label="Muscle"
            labels={MUSCLE_LABELS}
            onToggle={(muscle) =>
              onChange((current) => current.withMuscleToggled(muscle))
            }
            options={MUSCLES}
            selected={selection.muscles}
          />
        </div>
        <div className="grid gap-2">
          <SwitchRow
            checked={selection.onlyHerEquipment}
            label="Only her equipment"
            onCheckedChange={() =>
              onChange((current) => current.withOnlyHerEquipmentToggled())
            }
          />
          <SwitchRow
            checked={selection.bodyweightOnly}
            label="Bodyweight"
            onCheckedChange={() =>
              onChange((current) => current.withBodyweightToggled())
            }
          />
        </div>
        {activeCount > 0 && (
          <Button
            className="justify-self-start"
            onClick={clear}
            size="xs"
            variant="outline"
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type FrameProps = {
  presentation: LibraryPresentation;
  headingId: string;
  onClose: () => void;
  onDrawerCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};

function LibraryFrame({
  presentation,
  headingId,
  onClose,
  onDrawerCloseAutoFocus,
  children,
}: FrameProps) {
  if (presentation === "pane") {
    return (
      <aside
        data-parity-root="LibraryPanel"
        aria-labelledby={headingId}
        className="flex w-80 max-w-[40%] shrink-0 flex-col border-l border-border-default bg-surface-base"
      >
        {children}
      </aside>
    );
  }

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open>
      <SheetContent
        data-parity-root="LibraryPanel"
        aria-describedby={undefined}
        className="bg-surface-base p-0 sm:max-w-sm"
        onCloseAutoFocus={onDrawerCloseAutoFocus}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

function LibraryHeading({
  presentation,
  headingId,
}: {
  presentation: LibraryPresentation;
  headingId: string;
}) {
  if (presentation === "drawer") {
    return (
      <SheetTitle
        className={cn(
          WIDGET_TITLE_CLASS,
          "flex min-h-12 items-center font-body",
        )}
      >
        Exercise library
      </SheetTitle>
    );
  }

  return (
    <h2 className={WIDGET_TITLE_CLASS} id={headingId}>
      Exercise library
    </h2>
  );
}

export function LibraryPanel({
  presentation,
  purpose,
  libraryExercises,
  libraryEquipment,
  searchRef,
  onAdd,
  onClose,
  onDrawerCloseAutoFocus,
}: LibraryPanelProps) {
  const [selection, setSelection] = useState(LibrarySelection.initial);
  const [appliedPurpose, setAppliedPurpose] = useState<string | null>(null);
  const announce = useEditorAnnouncer();
  const focusLater = usePendingFocus();
  const content = useRef<HTMLDivElement>(null);
  const filtersTrigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const purposeId = useId();
  if (purpose && purpose.key !== appliedPurpose) {
    setAppliedPurpose(purpose.key);
    setSelection((current) => current.forOffer(purpose.offer));
  }
  const shown = selection.offered(libraryExercises, libraryEquipment);
  const panelFilters = selection.panelFilters();
  const countAnnouncement = useCountAnnouncement(shown.length, selection);

  function add(exercise: LibraryExercise) {
    const refusal = onAdd(exercise);
    countAnnouncement.cancelPending();
    if (refusal) {
      announce(REFUSED_ADD_TEXT[refusal](exercise.name));

      return;
    }
    announce(
      purpose
        ? `${exercise.name} added to ${purpose.destination}`
        : `${exercise.name} added`,
    );
  }

  function removeFilter(filter: ActiveFilter, index: number) {
    setSelection((current) => current.withoutFilter(filter));
    focusLater(() => {
      const chips = [
        ...(content.current?.querySelectorAll<HTMLElement>(
          "[data-active-filters] li button",
        ) ?? []),
      ];

      return chips[index] ?? chips.at(-1) ?? filtersTrigger.current;
    });
  }

  function clearFilters() {
    setSelection((current) => current.cleared());
    focusLater(() => searchRef.current);
  }

  return (
    <LibraryFrame
      headingId={headingId}
      onClose={onClose}
      onDrawerCloseAutoFocus={onDrawerCloseAutoFocus}
      presentation={presentation}
    >
      <div className="contents" ref={content}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-border-subtle p-4">
          <LibraryHeading headingId={headingId} presentation={presentation} />
          {purpose && (
            <p className="sr-only" id={purposeId}>
              {purpose.label}
            </p>
          )}
          <SearchField
            aria-describedby={purpose ? purposeId : undefined}
            aria-label="Search exercises"
            onChange={(event) => {
              const query = event.target.value;
              setSelection((current) => current.withQuery(query));
            }}
            placeholder="Search exercises"
            ref={searchRef}
            value={selection.query}
          />
          <div className="grid grid-cols-2 gap-2">
            <OptionSelect
              label="Exercise type"
              onChange={(type) =>
                setSelection((current) => current.withType(type))
              }
              options={TYPE_OPTIONS}
              value={selection.type}
            />
            <FiltersPopover
              activeCount={panelFilters.length}
              onChange={setSelection}
              selection={selection}
              triggerRef={filtersTrigger}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-page p-3">
          {shown.length === 0 ? (
            <NoMatches
              filters={selection.activeFilters()}
              onClear={clearFilters}
              onRemove={removeFilter}
              type={selection.type}
            />
          ) : (
            <ul aria-label="Exercises" className="grid gap-3">
              {shown.map((exercise) => (
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
