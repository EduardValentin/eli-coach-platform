import {
  countExercisesByStatus,
  EXERCISE_EQUIPMENT_FILTERS,
  EXERCISE_STATUSES,
  EXERCISE_TYPE_FILTERS,
  ExerciseSelection,
  sortExercises,
  type ExerciseEquipmentFilter,
  type ExerciseSortKey,
  type ExerciseStatus,
  type ExerciseTypeFilter,
} from "@eli-coach-platform/domain/exercise";
import {
  CountedSelect,
  ListingToolbar,
  ListPager,
} from "@eli-coach-platform/ui/filters";
import {
  headerSort,
  pageOf,
  parsePage,
  parseSort,
  pathForPageOf,
  setParamOrDelete,
  setParamUnlessDefault,
  sortParams,
  useSearchParamsWriter,
  type SortChoice,
  type SortDirection,
} from "@eli-coach-platform/ui/lib";
import { ConfirmDialog } from "@eli-coach-platform/ui/overlays";
import { EmptyState } from "@eli-coach-platform/ui/portal";
import {
  Badge,
  Button,
  Card,
  ItemIdentity,
  MultiSelect,
  RowActionsMenu,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type RowMenuAction,
  type TableSort,
} from "@eli-coach-platform/ui/primitives";
import {
  Activity,
  Archive,
  ArchiveRestore,
  Dumbbell,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import { useState, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router";

import type { ExerciseView } from "~/features/exercise-library/public/exercises";
import { exerciseEditorPath } from "~/features/exercise-library/public/paths";

import {
  EXERCISE_TAG_LABELS,
  EXERCISE_TAGS,
  EXERCISE_TYPE_LABELS,
} from "./exercise-form";
import {
  DEFAULT_EXERCISE_STATUS,
  EXERCISE_FILTER_PARAMS,
  EXERCISE_LISTING_PARAMS,
  EXERCISE_SORT_RULE,
  EXERCISES_PER_PAGE,
  parseExerciseStatus,
} from "./exercise-listing-params";
import { libraryReturnState, type LibraryReturnState } from "./library-address";
import {
  useExerciseLifecycle,
  useExerciseLifecycleAnswer,
  type ExerciseWriteOutcomes,
  type PendingExerciseWrite,
} from "./use-exercise-lifecycle";

const COLUMN_COUNT = 6;

const NO_SELECTION = ExerciseSelection.none();

const TYPE_FILTER_LABELS: Readonly<Record<ExerciseTypeFilter, string>> = {
  any: "Any type",
  ...EXERCISE_TYPE_LABELS,
};

const EQUIPMENT_FILTER_LABELS: Readonly<
  Record<ExerciseEquipmentFilter, string>
> = {
  any: "Any equipment",
  none: "No equipment",
};

const STATUS_LABELS: Readonly<Record<ExerciseStatus, string>> = {
  active: "Active",
  archived: "Archived",
};

const HEAD_SORTS: Readonly<Record<SortDirection, TableSort>> = {
  asc: "ascending",
  desc: "descending",
};

type ExerciseSortChoice = SortChoice<ExerciseSortKey>;

type PendingDeletion = {
  exercise: ExerciseView;
  stage: "asking" | "kept" | "confirmed";
};

type ExerciseListingControls = {
  chooseSelection: (next: ExerciseSelection) => void;
  chooseSortKey: (key: ExerciseSortKey) => void;
  chooseStatus: (next: ExerciseStatus) => void;
  clearFilters: () => void;
  page: number;
  pathForPage: (page: number) => string;
  returnState: LibraryReturnState;
  selection: ExerciseSelection;
  sort: ExerciseSortChoice;
  status: ExerciseStatus;
};

export function ExerciseListing({
  exercises,
  heading,
}: {
  exercises: readonly ExerciseView[];
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const listing = useExerciseListingParams();
  const lifecycle = useExerciseLifecycle(heading);
  const deletion = useExerciseDeletion(heading, lifecycle.remove);
  const navigate = useNavigate();
  const { selection, sort, status } = listing;
  const inStatus = exercises.filter((exercise) => exercise.status === status);
  const matching = sortExercises(
    inStatus.filter((exercise) => selection.matches(exercise)),
    sort,
  );
  const statusCounts = countExercisesByStatus(
    exercises.filter((exercise) => selection.matches(exercise)),
  );
  const listPage = pageOf(matching, {
    page: listing.page,
    perPage: EXERCISES_PER_PAGE,
  });

  const edit = (exercise: ExerciseView) =>
    void navigate(exerciseEditorPath(exercise.id), {
      state: listing.returnState,
    });

  return (
    <div className="flex flex-col gap-2">
      <ListingToolbar
        filters={
          <>
            <ExerciseFilters
              exercises={inStatus}
              onSelectionChange={listing.chooseSelection}
              selection={selection}
            />
            <ExerciseStatusFilter
              counts={statusCounts}
              onChoose={listing.chooseStatus}
              status={status}
            />
          </>
        }
        parity="exercise-toolbar"
        search={
          <SearchField
            aria-label="Search exercises"
            className="w-full sm:w-72"
            onChange={(event) =>
              listing.chooseSelection(selection.withQuery(event.target.value))
            }
            placeholder="Search by name or muscle"
            size="sm"
            value={selection.query}
          />
        }
      />

      <Card data-parity="exercise-table" variant="table-panel">
        <Table>
          <TableHeader>
            <TableRow data-parity="exercise-header-row">
              <TableHead
                onSort={() => listing.chooseSortKey("name")}
                sort={headSortOf(sort, "name")}
              >
                Exercise
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Target muscles</TableHead>
              <TableHead
                onSort={() => listing.chooseSortKey("difficulty")}
                sort={headSortOf(sort, "difficulty")}
              >
                Difficulty
              </TableHead>
              <TableHead data-parity="exercise-video">Video</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listPage.items.length === 0 ? (
              <TableRow>
                <TableCell className="p-0" colSpan={COLUMN_COUNT}>
                  {inStatus.length === 0 ? (
                    <EmptyStatus status={status} />
                  ) : (
                    <NoMatchingExercises
                      onClearFilters={
                        selection.isActive() ? listing.clearFilters : undefined
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              listPage.items.map((exercise) => (
                <ExerciseRow
                  exercise={exercise}
                  key={exercise.id}
                  onArchive={() => lifecycle.archive(exercise)}
                  onDelete={() => deletion.ask(exercise)}
                  onEdit={() => edit(exercise)}
                  onRestore={() => lifecycle.restore(exercise)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      {listPage.pageCount > 1 && (
        <ListPager pathForPage={listing.pathForPage} view={listPage} />
      )}

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete"
        description="It’s removed for good. This can’t be undone."
        onConfirm={deletion.confirm}
        onOpenChange={(open) => {
          if (!open) deletion.keep();
        }}
        open={deletion.asking}
        returnFocusTo={deletion.returnFocusTo}
        title={`Delete “${deletion.name}”?`}
        tone="destructive"
      />

      {lifecycle.pending.map((pendingWrite) => (
        <ExerciseLifecycleAnswer
          outcomes={lifecycle.outcomes}
          key={pendingWrite.key}
          pendingWrite={pendingWrite}
        />
      ))}
    </div>
  );
}

function useExerciseDeletion(
  heading: RefObject<HTMLHeadingElement | null>,
  onConfirmed: (exercise: ExerciseView) => void,
) {
  const [deletion, setDeletion] = useState<PendingDeletion | null>(null);

  return {
    asking: deletion?.stage === "asking",
    name: deletion?.exercise.name ?? "",
    returnFocusTo: deletion?.stage === "confirmed" ? heading : undefined,
    ask: (exercise: ExerciseView) => setDeletion({ exercise, stage: "asking" }),
    keep: () => {
      if (deletion?.stage === "asking") {
        setDeletion({ ...deletion, stage: "kept" });
      }
    },
    confirm: () => {
      if (!deletion) return;

      setDeletion({ ...deletion, stage: "confirmed" });
      onConfirmed(deletion.exercise);
    },
  };
}

function useExerciseListingParams(): ExerciseListingControls {
  const { pathname, search } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const selection = ExerciseSelection.parse({
    type: searchParams.get(EXERCISE_LISTING_PARAMS.type),
    tags: (searchParams.get(EXERCISE_LISTING_PARAMS.tags) ?? "").split(","),
    equipment: searchParams.get(EXERCISE_LISTING_PARAMS.equipment),
    query: searchParams.get(EXERCISE_LISTING_PARAMS.query) ?? "",
  });
  const status = parseExerciseStatus(
    searchParams.get(EXERCISE_LISTING_PARAMS.status),
  );
  const sort = parseSort(
    EXERCISE_SORT_RULE,
    searchParams.get(EXERCISE_LISTING_PARAMS.sort),
    searchParams.get(EXERCISE_LISTING_PARAMS.direction),
  );

  const reviseFromFirstPage = (revise: (params: URLSearchParams) => void) =>
    replaceSearchParams((params) => {
      params.delete(EXERCISE_LISTING_PARAMS.page);
      revise(params);
    });

  const chooseSelection = (next: ExerciseSelection) =>
    reviseFromFirstPage((params) => {
      setParamUnlessDefault(params, EXERCISE_LISTING_PARAMS.type, {
        defaultValue: NO_SELECTION.type,
        value: next.type,
      });
      setParamUnlessDefault(params, EXERCISE_LISTING_PARAMS.tags, {
        defaultValue: NO_SELECTION.tags.join(","),
        value: next.tags.join(","),
      });
      setParamUnlessDefault(params, EXERCISE_LISTING_PARAMS.equipment, {
        defaultValue: NO_SELECTION.equipment,
        value: next.equipment,
      });
      setParamUnlessDefault(params, EXERCISE_LISTING_PARAMS.query, {
        defaultValue: NO_SELECTION.query,
        value: next.query,
      });
    });

  const chooseSortKey = (key: ExerciseSortKey) => {
    const chosen = sortParams(
      EXERCISE_SORT_RULE,
      headerSort(EXERCISE_SORT_RULE, sort, key),
    );

    reviseFromFirstPage((params) => {
      setParamOrDelete(params, EXERCISE_LISTING_PARAMS.sort, chosen.sort);
      setParamOrDelete(params, EXERCISE_LISTING_PARAMS.direction, chosen.dir);
    });
  };

  const chooseStatus = (next: ExerciseStatus) =>
    reviseFromFirstPage((params) => {
      setParamUnlessDefault(params, EXERCISE_LISTING_PARAMS.status, {
        defaultValue: DEFAULT_EXERCISE_STATUS,
        value: next,
      });
    });

  const clearFilters = () =>
    reviseFromFirstPage((params) => {
      for (const param of Object.values(EXERCISE_FILTER_PARAMS)) {
        params.delete(param);
      }
    });

  return {
    chooseSelection,
    chooseSortKey,
    chooseStatus,
    clearFilters,
    page: parsePage(searchParams.get(EXERCISE_LISTING_PARAMS.page)),
    pathForPage: (page) =>
      pathForPageOf(
        { pageParam: EXERCISE_LISTING_PARAMS.page, pathname, searchParams },
        page,
      ),
    returnState: libraryReturnState(search),
    selection,
    sort,
    status,
  };
}

function headSortOf(sort: ExerciseSortChoice, key: ExerciseSortKey): TableSort {
  return sort.key === key ? HEAD_SORTS[sort.direction] : "none";
}

function ExerciseFilters({
  exercises,
  onSelectionChange,
  selection,
}: {
  exercises: readonly ExerciseView[];
  onSelectionChange: (next: ExerciseSelection) => void;
  selection: ExerciseSelection;
}) {
  return (
    <>
      <CountedSelect
        counts={selection.countsByType(exercises)}
        label="Type"
        labels={TYPE_FILTER_LABELS}
        onChoose={(type) => onSelectionChange(selection.withType(type))}
        options={EXERCISE_TYPE_FILTERS}
        value={selection.type}
      />
      <MultiSelect
        counts={selection.countsByTag(exercises)}
        label="Tags"
        labels={EXERCISE_TAG_LABELS}
        onToggle={(tag) => onSelectionChange(selection.withTagToggled(tag))}
        options={EXERCISE_TAGS}
        selected={selection.tags}
      />
      <CountedSelect
        counts={selection.countsByEquipment(exercises)}
        label="Equipment"
        labels={EQUIPMENT_FILTER_LABELS}
        onChoose={(equipment) =>
          onSelectionChange(selection.withEquipment(equipment))
        }
        options={EXERCISE_EQUIPMENT_FILTERS}
        value={selection.equipment}
      />
    </>
  );
}

function ExerciseStatusFilter({
  counts,
  onChoose,
  status,
}: {
  counts: Readonly<Record<ExerciseStatus, number>>;
  onChoose: (next: ExerciseStatus) => void;
  status: ExerciseStatus;
}) {
  return (
    <CountedSelect
      counts={counts}
      label="Status"
      labels={STATUS_LABELS}
      onChoose={onChoose}
      options={EXERCISE_STATUSES}
      triggerParity="library-status-filter"
      value={status}
    />
  );
}

function EmptyStatus({ status }: { status: ExerciseStatus }) {
  return status === "archived" ? (
    <EmptyState
      description="Exercises you archive appear here, ready to restore."
      icon={Archive}
      title="No archived exercises"
    />
  ) : (
    <EmptyState
      description="Exercises you add appear here."
      icon={Dumbbell}
      title="No exercises yet"
    />
  );
}

function NoMatchingExercises({
  onClearFilters,
}: {
  onClearFilters?: () => void;
}) {
  return (
    <EmptyState
      action={
        onClearFilters && (
          <Button onClick={onClearFilters} size="sm" variant="outline">
            Clear filters
          </Button>
        )
      }
      description="Try another filter or search."
      icon={SearchX}
      title="No exercises match"
    />
  );
}

type ExerciseRowProps = {
  exercise: ExerciseView;
  onArchive: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRestore: () => void;
};

function ExerciseRow(props: ExerciseRowProps) {
  const { exercise } = props;
  const equipment =
    exercise.equipment.length > 0
      ? exercise.equipment.join(", ")
      : "No equipment";

  return (
    <TableRow data-parity="exercise-row">
      <TableCell>
        <ItemIdentity
          glyphAttributes={{ "data-parity": "exercise-glyph" }}
          icon={Activity}
          summary={`${EXERCISE_TYPE_LABELS[exercise.type]} · ${equipment}`}
          summaryAttributes={{ "data-parity": "exercise-summary" }}
          title={exercise.name}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1" data-parity="exercise-tags">
          {exercise.tags.map((tag) => (
            <Badge key={tag} tone="brand-secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1" data-parity="exercise-muscles">
          {exercise.primaryMuscles.map((muscle) => (
            <Badge key={muscle} tone="muted">
              {muscle}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge data-parity="exercise-difficulty" tone="secondary">
          {exercise.difficulty}
        </Badge>
      </TableCell>
      <TableCell
        className="text-sm text-text-secondary"
        data-parity="exercise-video"
      >
        {exercise.video ? "Attached" : "—"}
      </TableCell>
      <TableCell data-parity="exercise-actions-cell">
        <div
          className="flex items-center justify-end"
          data-parity="library-item-actions"
        >
          <RowActionsMenu
            actions={rowActionsFor(props)}
            label={`Actions for ${exercise.name}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function rowActionsFor({
  exercise,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
}: ExerciseRowProps): RowMenuAction[] {
  const deleteAction: RowMenuAction = {
    icon: Trash2,
    label: "Delete",
    name: "delete",
    onSelect: onDelete,
    tone: "destructive",
  };

  if (exercise.status === "active") {
    return [
      { icon: Pencil, label: "Edit", name: "edit", onSelect: onEdit },
      { icon: Archive, label: "Archive", name: "archive", onSelect: onArchive },
      deleteAction,
    ];
  }

  return [
    {
      icon: ArchiveRestore,
      label: "Restore",
      name: "restore",
      onSelect: onRestore,
    },
    deleteAction,
  ];
}

function ExerciseLifecycleAnswer({
  outcomes,
  pendingWrite,
}: {
  outcomes: ExerciseWriteOutcomes;
  pendingWrite: PendingExerciseWrite;
}) {
  useExerciseLifecycleAnswer(pendingWrite, outcomes);

  return null;
}
