import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Archive, ChefHat, SearchX } from 'lucide-react';
import { useNutrition } from '../../../context/NutritionContext';
import type { Tag } from '../../../context/NutritionContext';
import {
  countsByStatus,
  parseStatus,
  statusOf,
  usageHint,
  type LibraryItemStatus,
} from '../../../domain/libraryLifecycle';
import { useLibraryLifecycle } from '../../../hooks/useLibraryLifecycle';
import { useListingSearchParams } from '../../../hooks/useListingSearchParams';
import {
  LIBRARY_ITEMS_PER_PAGE,
  knownValues,
  parseSort,
  sortParams,
  toggled,
} from '../../../utils/libraryListing';
import { pageOf } from '../../../utils/listPaging';
import {
  CALORIE_BAND_LABELS,
  CALORIE_BAND_OPTIONS,
  RECIPE_FILTER_FAMILIES,
  RECIPE_SORT,
  RECIPE_SORT_OPTIONS,
  countsByCalorieBand,
  countsByTag,
  hasActiveRecipeFilters,
  listRecipes,
  matchesRecipeFilters,
  parseCalorieBand,
  sortRecipes,
  type RecipeSelection,
  type RecipeTagFamily,
} from '../../../utils/recipeListing';
import { Button } from '../../ui/button';
import { CountedMultiSelect } from '../../CountedMultiSelect';
import { CountedSelect } from '../../CountedSelect';
import { EmptyState } from '../../EmptyState';
import { ListingToolbar } from '../../ListingToolbar';
import { ListPager } from '../../ListPager';
import { SearchField } from '../../SearchField';
import { SortControl } from '../../SortControl';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { LibraryItemActions, LibraryStatusFilter } from '../LibraryLifecycleControls';
import { RecipeCard } from './RecipeCard';
import { TAG_FAMILY_LABELS } from './nutrition-constants';

const FAMILY_PARAM: Record<RecipeTagFamily, string> = {
  'meal-time': 'mealtime',
  'cycle-phase': 'cycle',
  dietary: 'dietary',
};

function emptyCopy(status: LibraryItemStatus, libraryIsEmpty: boolean) {
  if (!libraryIsEmpty) {
    return { icon: SearchX, title: 'No recipes match', description: 'Try another filter or search.' };
  }
  if (status === 'archived') {
    return {
      icon: Archive,
      title: 'No archived recipes',
      description: 'Recipes you archive appear here, ready to restore.',
    };
  }
  return { icon: ChefHat, title: 'No recipes yet', description: 'Recipes you build appear here.' };
}

function labelsOf(tags: readonly Tag[]): Record<string, string> {
  return Object.fromEntries(tags.map((tag) => [tag.id, tag.label]));
}

export function RecipeLibrary({ tabs }: { tabs: ReactNode }) {
  const {
    recipes,
    tags,
    foods,
    archiveRecipe,
    restoreRecipe,
    deleteRecipe,
    getRecipeUsage,
  } = useNutrition();
  const navigate = useNavigate();
  const listing = useListingSearchParams();
  const lifecycle = useLibraryLifecycle({
    noun: 'recipe',
    archive: archiveRecipe,
    restore: restoreRecipe,
    remove: deleteRecipe,
  });

  const familyTags = (family: RecipeTagFamily) => tags.filter((tag) => tag.family === family);
  const selection: RecipeSelection = {
    tags: {
      'meal-time': knownValues(
        listing.readList(FAMILY_PARAM['meal-time']),
        familyTags('meal-time').map((tag) => tag.id),
      ),
      'cycle-phase': knownValues(
        listing.readList(FAMILY_PARAM['cycle-phase']),
        familyTags('cycle-phase').map((tag) => tag.id),
      ),
      dietary: knownValues(
        listing.readList(FAMILY_PARAM.dietary),
        familyTags('dietary').map((tag) => tag.id),
      ),
    },
    calories: parseCalorieBand(listing.read('calories')),
    query: listing.read('q') ?? '',
  };
  const status = parseStatus(listing.read('status'));
  const sort = parseSort(RECIPE_SORT, listing.read('sort'), listing.read('dir'));

  const listed = listRecipes(recipes, foods);
  const inStatus = listed.filter((item) => statusOf(item.recipe) === status);
  const matching = sortRecipes(
    inStatus.filter((item) => matchesRecipeFilters(item, selection)),
    sort,
  );
  const page = pageOf(matching, { page: listing.page, perPage: LIBRARY_ITEMS_PER_PAGE });
  const statusCounts = countsByStatus(
    listed.filter((item) => matchesRecipeFilters(item, selection)).map((item) => item.recipe),
  );
  const empty = emptyCopy(status, inStatus.length === 0);

  const clearFilters = () =>
    listing.write({
      [FAMILY_PARAM['meal-time']]: null,
      [FAMILY_PARAM['cycle-phase']]: null,
      [FAMILY_PARAM.dietary]: null,
      calories: null,
      q: null,
    });

  return (
    <>
      <ListingToolbar
        view={tabs}
        filters={
          <>
            {RECIPE_FILTER_FAMILIES.map((family) => {
              const options = familyTags(family);
              return (
                <CountedMultiSelect
                  key={family}
                  label={TAG_FAMILY_LABELS[family]}
                  selected={selection.tags[family]}
                  options={options.map((tag) => tag.id)}
                  labels={labelsOf(options)}
                  counts={countsByTag(inStatus, selection, { family, tags: options })}
                  onToggle={(tagId) =>
                    listing.write({ [FAMILY_PARAM[family]]: toggled(selection.tags[family], tagId) })
                  }
                />
              );
            })}
            <CountedSelect
              label="Calories"
              value={selection.calories}
              options={CALORIE_BAND_OPTIONS}
              labels={CALORIE_BAND_LABELS}
              counts={countsByCalorieBand(inStatus, selection)}
              onChoose={(band) => listing.write({ calories: band === 'any' ? null : band })}
            />
            <LibraryStatusFilter
              status={status}
              counts={statusCounts}
              onChoose={(chosen) => listing.write({ status: chosen === 'active' ? null : chosen })}
            />
          </>
        }
        search={
          <>
            <SearchField
              aria-label="Search recipes"
              placeholder="Search by name"
              size="sm"
              className="w-full sm:w-72"
              value={selection.query}
              onChange={(event) => listing.write({ q: event.target.value })}
            />
            <SortControl
              options={RECIPE_SORT_OPTIONS}
              sort={sort}
              onChange={(chosen) => listing.write(sortParams(RECIPE_SORT, chosen))}
              className="sm:w-72"
            />
          </>
        }
      />

      {page.items.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={
            inStatus.length > 0 && hasActiveRecipeFilters(selection) ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {page.items.map(({ recipe }) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                actions={
                  <LibraryItemActions
                    itemName={recipe.name}
                    status={status}
                    usage={usageHint(getRecipeUsage(recipe.id))}
                    onEdit={() => navigate(`/coach/nutrition/recipe-builder/${recipe.id}`)}
                    onArchive={() => lifecycle.archive(recipe)}
                    onRestore={() => lifecycle.restore(recipe)}
                    onDelete={() => lifecycle.requestDeletion(recipe)}
                  />
                }
              />
            ))}
          </div>
          {page.pageCount > 1 && <ListPager view={page} pathForPage={listing.pathForPage} />}
        </>
      )}

      <DeleteConfirmDialog
        subject={lifecycle.deletionSubject}
        onConfirm={lifecycle.confirmDeletion}
        onCancel={lifecycle.cancelDeletion}
      />
    </>
  );
}
