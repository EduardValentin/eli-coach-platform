import {
  EXERCISE_EQUIPMENT_FILTERS,
  EXERCISE_TYPE_FILTERS,
  ExerciseSelection,
  sortExercises,
  type ExerciseEquipmentFilter,
  type ExerciseSortKey,
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
  setParamUnlessDefault,
  sortParams,
  useSearchParamsWriter,
  type SortChoice,
  type SortDirection,
} from "@eli-coach-platform/ui/lib";
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
  type TableSort,
} from "@eli-coach-platform/ui/primitives";
import { Activity, Dumbbell, Pencil, SearchX } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import type { ExerciseView } from "~/features/exercise-library/public/exercises";
import { exerciseEditorPath } from "~/features/exercise-library/public/paths";

import {
  EXERCISE_TAG_LABELS,
  EXERCISE_TAGS,
  EXERCISE_TYPE_LABELS,
} from "./exercise-form";
import {
  EXERCISE_FILTER_PARAMS,
  EXERCISE_LISTING_PARAMS,
  EXERCISE_SORT_RULE,
  EXERCISES_PER_PAGE,
} from "./exercise-listing-params";
import { libraryReturnState } from "./library-address";

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

const HEAD_SORTS: Readonly<Record<SortDirection, TableSort>> = {
  asc: "ascending",
  desc: "descending",
};

type ExerciseSortChoice = SortChoice<ExerciseSortKey>;

type ExerciseListingParams = {
  chooseSelection: (next: ExerciseSelection) => void;
  chooseSortKey: (key: ExerciseSortKey) => void;
  clearFilters: () => void;
  page: number;
  pathForPage: (page: number) => string;
  returnState: ReturnType<typeof libraryReturnState>;
  selection: ExerciseSelection;
  sort: ExerciseSortChoice;
};

export function ExerciseListing({
  exercises,
}: {
  exercises: readonly ExerciseView[];
}) {
  const listing = useExerciseListingParams();
  const navigate = useNavigate();
  const { selection, sort } = listing;
  const matching = sortExercises(
    exercises.filter((exercise) => selection.matches(exercise)),
    sort,
  );
  const view = pageOf(matching, {
    page: listing.page,
    perPage: EXERCISES_PER_PAGE,
  });

  const edit = (exercise: ExerciseView) =>
    void navigate(exerciseEditorPath(exercise.id), {
      state: listing.returnState,
    });

  return (
    <>
      <ListingToolbar
        filters={
          <ExerciseFilters
            exercises={exercises}
            onSelectionChange={listing.chooseSelection}
            selection={selection}
          />
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
            {view.items.length === 0 ? (
              <TableRow>
                <TableCell className="p-0" colSpan={COLUMN_COUNT}>
                  <NoExercisesShown
                    libraryIsEmpty={exercises.length === 0}
                    onClearFilters={
                      selection.isActive() ? listing.clearFilters : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              view.items.map((exercise) => (
                <ExerciseRow
                  exercise={exercise}
                  key={exercise.id}
                  onEdit={() => edit(exercise)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      {view.pageCount > 1 && (
        <ListPager pathForPage={listing.pathForPage} view={view} />
      )}
    </>
  );
}

function useExerciseListingParams(): ExerciseListingParams {
  const { pathname, search } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const selection = ExerciseSelection.parse({
    type: searchParams.get(EXERCISE_LISTING_PARAMS.type),
    tags: (searchParams.get(EXERCISE_LISTING_PARAMS.tags) ?? "").split(","),
    equipment: searchParams.get(EXERCISE_LISTING_PARAMS.equipment),
    query: searchParams.get(EXERCISE_LISTING_PARAMS.query) ?? "",
  });
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
      writeParam(params, EXERCISE_LISTING_PARAMS.sort, chosen.sort);
      writeParam(params, EXERCISE_LISTING_PARAMS.direction, chosen.dir);
    });
  };

  const clearFilters = () =>
    reviseFromFirstPage((params) => {
      for (const param of Object.values(EXERCISE_FILTER_PARAMS)) {
        params.delete(param);
      }
    });

  return {
    chooseSelection,
    chooseSortKey,
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
  };
}

function writeParam(
  params: URLSearchParams,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    params.delete(name);
    return;
  }

  params.set(name, value);
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

function NoExercisesShown({
  libraryIsEmpty,
  onClearFilters,
}: {
  libraryIsEmpty: boolean;
  onClearFilters?: () => void;
}) {
  if (libraryIsEmpty) {
    return (
      <EmptyState
        description="Exercises you add appear here."
        icon={Dumbbell}
        title="No exercises yet"
      />
    );
  }

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

function ExerciseRow({
  exercise,
  onEdit,
}: {
  exercise: ExerciseView;
  onEdit: () => void;
}) {
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
            actions={[
              { icon: Pencil, label: "Edit", name: "edit", onSelect: onEdit },
            ]}
            label={`Actions for ${exercise.name}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
