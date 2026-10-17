import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Archive, LayoutGrid, SearchX, Shuffle, Tags, Utensils } from 'lucide-react';
import { useNutrition, FOOD_CATEGORIES } from '../../../context/NutritionContext';
import { useAppState } from '../../../context/AppContext';
import {
  countsByStatus,
  itemsWithStatus,
  parseStatus,
  usageHint,
  type LibraryItemStatus,
} from '../../../domain/libraryLifecycle';
import { useLibraryLifecycle } from '../../../hooks/useLibraryLifecycle';
import { useListingSearchParams } from '../../../hooks/useListingSearchParams';
import {
  FOOD_SORT,
  countsByCategory,
  hasActiveFoodFilters,
  matchesFoodFilters,
  sortFoods,
  type FoodSelection,
  type FoodSortKey,
} from '../../../utils/foodListing';
import {
  LIBRARY_ITEMS_PER_PAGE,
  headerSort,
  knownValues,
  parseSort,
  sortParams,
  toggled,
} from '../../../utils/libraryListing';
import { pageOf } from '../../../utils/listPaging';
import { Button } from '../../ui/button';
import { MultiSelect } from '../../MultiSelect';
import { EmptyState } from '../../EmptyState';
import { FilterChip, FilterChipGroup } from '../../FilterChipGroup';
import { ListingToolbar } from '../../ListingToolbar';
import { ListPager } from '../../ListPager';
import { SearchField } from '../../SearchField';
import { TablePanel } from '../../TablePanel';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { LibraryItemActions, LibraryStatusFilter } from '../LibraryLifecycleControls';
import { FoodTable } from './FoodTable';
import { CATEGORY_LABELS } from './nutrition-constants';
import { FoodTagBoard } from './FoodTagBoard';
import { EquivalenceGroups } from './EquivalenceGroups';

type FoodView = 'catalog' | 'board' | 'groups';

function emptyCopy(status: LibraryItemStatus, libraryIsEmpty: boolean) {
  if (!libraryIsEmpty) {
    return { icon: SearchX, title: 'No foods match', description: 'Try another filter or search.' };
  }
  if (status === 'archived') {
    return {
      icon: Archive,
      title: 'No archived foods',
      description: 'Foods you archive appear here, ready to restore.',
    };
  }
  return { icon: Utensils, title: 'No foods yet', description: 'Foods you add appear here.' };
}

export function FoodLibrary({ tabs }: { tabs: ReactNode }) {
  const { foods, archiveFood, restoreFood, deleteFood, getFoodUsage } = useNutrition();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const listing = useListingSearchParams();
  const lifecycle = useLibraryLifecycle({
    archive: archiveFood,
    restore: restoreFood,
    remove: deleteFood,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedView, setSelectedView] = useState<FoodView>('catalog');
  const view = isPostMvp ? selectedView : 'catalog';

  const selection: FoodSelection = {
    categories: knownValues(listing.readList('category'), FOOD_CATEGORIES),
    query: listing.read('q') ?? '',
  };
  const status = parseStatus(listing.read('status'));
  const sort = parseSort(FOOD_SORT, listing.read('sort'), listing.read('dir'));

  const inStatus = itemsWithStatus(foods, status);
  const matching = sortFoods(
    inStatus.filter((food) => matchesFoodFilters(food, selection)),
    sort,
  );
  const page = pageOf(matching, { page: listing.page, perPage: LIBRARY_ITEMS_PER_PAGE });
  const statusCounts = countsByStatus(foods.filter((food) => matchesFoodFilters(food, selection)));
  const empty = emptyCopy(status, inStatus.length === 0);

  const chooseSort = (key: FoodSortKey) =>
    listing.write(sortParams(FOOD_SORT, headerSort(FOOD_SORT, sort, key)));

  const clearFilters = () => listing.write({ category: null, q: null });

  const viewSwitch = isPostMvp && (
    <FilterChipGroup
      aria-label="Food library view"
      value={view}
      onValueChange={(value) => {
        if (value) setSelectedView(value as FoodView);
      }}
    >
      <FilterChip value="catalog">
        <LayoutGrid size={16} /> Catalog
      </FilterChip>
      <FilterChip value="board">
        <Tags size={16} /> Tag board
      </FilterChip>
      <FilterChip value="groups">
        <Shuffle size={16} /> Swap groups
      </FilterChip>
    </FilterChipGroup>
  );

  if (view !== 'catalog') {
    return (
      <>
        <ListingToolbar view={<>{tabs}{viewSwitch}</>} />
        {view === 'board' ? <FoodTagBoard /> : <EquivalenceGroups />}
      </>
    );
  }

  return (
    <>
      <ListingToolbar
        parity="food-toolbar"
        view={<>{tabs}{viewSwitch}</>}
        filters={
          <>
            <MultiSelect
              label="Category"
              selected={selection.categories}
              options={FOOD_CATEGORIES}
              labels={CATEGORY_LABELS}
              counts={countsByCategory(inStatus, selection)}
              onToggle={(category) =>
                listing.write({ category: toggled(selection.categories, category) })
              }
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
            aria-label="Search foods"
            placeholder="Search by name"
            size="sm"
            className="w-full sm:w-72"
            value={selection.query}
            onChange={(event) => listing.write({ q: event.target.value })}
          />
        }
      />

      <TablePanel parity="food-table">
        <FoodTable
          foods={page.items}
          sort={sort}
          onSort={chooseSort}
          empty={
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
              action={
                inStatus.length > 0 && hasActiveFoodFilters(selection) ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
          actionsFor={(food) => (
            <LibraryItemActions
              itemName={food.name}
              status={status}
              usage={usageHint(getFoodUsage(food.id))}
              onEdit={() => navigate(`/coach/nutrition/foods/${food.id}`, { state: { library: location.search } })}
              onArchive={() => lifecycle.archive(food)}
              onRestore={() => lifecycle.restore(food)}
              onDelete={() => lifecycle.requestDeletion(food)}
            />
          )}
        />
      </TablePanel>
      {page.pageCount > 1 && <ListPager view={page} pathForPage={listing.pathForPage} />}

      <DeleteConfirmDialog
        subject={lifecycle.deletionSubject}
        onConfirm={lifecycle.confirmDeletion}
        onCancel={lifecycle.cancelDeletion}
      />
    </>
  );
}
