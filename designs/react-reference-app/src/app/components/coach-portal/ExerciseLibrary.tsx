import type { ReactNode } from 'react';
import { Activity, Archive, Dumbbell, SearchX } from 'lucide-react';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import {
  countsByStatus,
  itemsWithStatus,
  parseStatus,
  usageHint,
  type LibraryItemStatus,
} from '../../domain/libraryLifecycle';
import { EXERCISE_TYPE_LABELS } from '../../domain/exercises';
import { useLibraryLifecycle } from '../../hooks/useLibraryLifecycle';
import { useListingSearchParams } from '../../hooks/useListingSearchParams';
import {
  EXERCISE_SORT,
  EXERCISE_TAGS,
  hasActiveExerciseFilters,
  matchesExerciseFilters,
  parseEquipment,
  parseType,
  sortExercises,
  type ExerciseSelection,
  type ExerciseSortKey,
} from '../../utils/exerciseFilters';
import {
  LIBRARY_ITEMS_PER_PAGE,
  headerSort,
  knownValues,
  parseSort,
  sortParams,
} from '../../utils/libraryListing';
import { pageOf } from '../../utils/listPaging';
import { EmptyState } from '../EmptyState';
import { ListingToolbar } from '../ListingToolbar';
import { ListPager } from '../ListPager';
import { SearchField } from '../SearchField';
import { SortableTableHead } from '../SortableTableHead';
import { TablePanel } from '../TablePanel';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ExerciseFilters } from './ExerciseFilters';
import { LibraryItemActions, LibraryStatusFilter } from './LibraryLifecycleControls';

const COLUMN_COUNT = 6;

function emptyCopy(status: LibraryItemStatus, libraryIsEmpty: boolean) {
  if (!libraryIsEmpty) {
    return { icon: SearchX, title: 'No exercises match', description: 'Try another filter or search.' };
  }
  if (status === 'archived') {
    return {
      icon: Archive,
      title: 'No archived exercises',
      description: 'Exercises you archive appear here, ready to restore.',
    };
  }
  return { icon: Dumbbell, title: 'No exercises yet', description: 'Exercises you add appear here.' };
}

function ExerciseRow({
  exercise,
  actions,
}: {
  exercise: Exercise;
  actions: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-surface-quiet flex items-center justify-center text-text-secondary shrink-0"
          >
            <Activity size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm text-text-primary">{exercise.name}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {[
                EXERCISE_TYPE_LABELS[exercise.type],
                exercise.equipment.length > 0 ? exercise.equipment.join(', ') : 'No equipment',
              ].join(' · ')}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(exercise.tags ?? []).map((tag) => (
            <Badge key={tag} tone="brand-secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {exercise.primaryMuscles.map((muscle) => (
            <Badge key={muscle} tone="muted">
              {muscle}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge tone="secondary">{exercise.difficulty}</Badge>
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {exercise.videoUrl ? 'Attached' : '—'}
      </TableCell>
      <TableCell>{actions}</TableCell>
    </TableRow>
  );
}

export function ExerciseLibrary({ onEdit }: { onEdit: (exerciseId: string) => void }) {
  const { exercises, archiveExercise, restoreExercise, deleteExercise, getExerciseUsage } =
    useTraining();
  const listing = useListingSearchParams();
  const lifecycle = useLibraryLifecycle({
    noun: 'exercise',
    archive: archiveExercise,
    restore: restoreExercise,
    remove: deleteExercise,
  });

  const selection: ExerciseSelection = {
    type: parseType(listing.read('type')),
    tags: knownValues(listing.readList('tags'), EXERCISE_TAGS),
    equipment: parseEquipment(listing.read('equipment')),
    query: listing.read('q') ?? '',
  };
  const status = parseStatus(listing.read('status'));
  const sort = parseSort(EXERCISE_SORT, listing.read('sort'), listing.read('dir'));

  const inStatus = itemsWithStatus(exercises, status);
  const matching = sortExercises(
    inStatus.filter((exercise) => matchesExerciseFilters(exercise, selection)),
    sort,
  );
  const view = pageOf(matching, { page: listing.page, perPage: LIBRARY_ITEMS_PER_PAGE });
  const statusCounts = countsByStatus(
    exercises.filter((exercise) => matchesExerciseFilters(exercise, selection)),
  );
  const empty = emptyCopy(status, inStatus.length === 0);

  const chooseSelection = (next: ExerciseSelection) =>
    listing.write({
      type: next.type === 'any' ? null : next.type,
      tags: next.tags,
      equipment: next.equipment === 'any' ? null : next.equipment,
    });

  const chooseSort = (key: ExerciseSortKey) =>
    listing.write(sortParams(EXERCISE_SORT, headerSort(EXERCISE_SORT, sort, key)));

  const clearFilters = () => listing.write({ type: null, tags: null, equipment: null, q: null });

  return (
    <>
      <ListingToolbar
        filters={
          <>
            <ExerciseFilters
              exercises={inStatus}
              selection={selection}
              onSelectionChange={chooseSelection}
            />
            <LibraryStatusFilter
              status={status}
              counts={statusCounts}
              onChoose={(chosen) => listing.write({ status: chosen === 'active' ? null : chosen })}
            />
          </>
        }
        search={
          <SearchField
            aria-label="Search exercises"
            placeholder="Search by name or muscle"
            size="sm"
            className="w-full sm:w-72"
            value={selection.query}
            onChange={(event) => listing.write({ q: event.target.value })}
          />
        }
      />

      <TablePanel>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Exercise"
                active={sort.key === 'name'}
                direction={sort.key === 'name' ? sort.direction : EXERCISE_SORT.defaultDirection.name}
                onSort={() => chooseSort('name')}
              />
              <TableHead>Tags</TableHead>
              <TableHead>Target muscles</TableHead>
              <SortableTableHead
                label="Difficulty"
                active={sort.key === 'difficulty'}
                direction={
                  sort.key === 'difficulty' ? sort.direction : EXERCISE_SORT.defaultDirection.difficulty
                }
                onSort={() => chooseSort('difficulty')}
              />
              <TableHead>Video</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="p-0">
                  <EmptyState
                    icon={empty.icon}
                    title={empty.title}
                    description={empty.description}
                    action={
                      inStatus.length > 0 && hasActiveExerciseFilters(selection) ? (
                        <Button variant="outline" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              view.items.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  actions={
                    <LibraryItemActions
                      itemName={exercise.name}
                      status={status}
                      usage={usageHint(getExerciseUsage(exercise.id))}
                      onEdit={() => onEdit(exercise.id)}
                      onArchive={() => lifecycle.archive(exercise)}
                      onRestore={() => lifecycle.restore(exercise)}
                      onDelete={() => lifecycle.requestDeletion(exercise)}
                    />
                  }
                />
              ))
            )}
          </TableBody>
        </Table>
      </TablePanel>
      {view.pageCount > 1 && <ListPager view={view} pathForPage={listing.pathForPage} />}

      <DeleteConfirmDialog
        subject={lifecycle.deletionSubject}
        onConfirm={lifecycle.confirmDeletion}
        onCancel={lifecycle.cancelDeletion}
      />
    </>
  );
}
