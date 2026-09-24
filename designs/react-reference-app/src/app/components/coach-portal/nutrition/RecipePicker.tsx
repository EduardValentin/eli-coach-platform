import { useMemo, useState } from 'react';
import { Check, Clock, Plus, X } from 'lucide-react';
import {
  useNutrition,
  recipeMacros,
  CALORIE_BANDS,
} from '../../../context/NutritionContext';
import type { Tag } from '../../../context/NutritionContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';
import { ScrollArea } from '../../ui/scroll-area';
import { SearchField } from '../../SearchField';
import { LABEL_CLASS } from '../../typography';
import { FilterDropdown } from './FilterDropdown';
import { RecipeVisual } from './RecipeVisual';
import { TagPill } from './TagPill';
import { TAG_FAMILY_LABELS, MACRO_DOT } from './nutrition-constants';
import { MEAL_ROLE_LABEL } from './plan-constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecipePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The meal role this slot is designated for (used for suggested sort + subtitle). */
  mealRoleId: string;
  /** ID of the recipe currently assigned to the slot (shown as "Selected"). */
  currentRecipeId: string | undefined;
  /** IDs of recipes already marked as alternatives for this slot. */
  alternativeRecipeIds: string[];
  /** Called when the user picks a recipe; the dialog should close. */
  onPick: (recipeId: string) => void;
  /** Called when the user toggles the alternative status of a recipe. */
  onToggleAlt: (recipeId: string, isCurrentlyAlt: boolean) => void;
}

// ---------------------------------------------------------------------------
// RecipePicker
// ---------------------------------------------------------------------------

export function RecipePicker({
  open,
  onOpenChange,
  mealRoleId,
  currentRecipeId,
  alternativeRecipeIds,
  onPick,
  onToggleAlt,
}: RecipePickerProps) {
  const { recipes, foods, tags } = useNutrition();

  // ----- Filter state -------------------------------------------------------
  const [query, setQuery] = useState('');
  // Combined multi-select tag ids: meal-time + cycle-phase + dietary + nutrient
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  // Single-select calorie band (kcal ceiling)
  const [activeBand, setActiveBand] = useState<number | null>(null);

  const toggleTag = (id: string) =>
    setActiveTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const hasActiveFilters =
    activeTagIds.length > 0 || activeBand !== null || query.trim() !== '';

  const clearFilters = () => {
    setQuery('');
    setActiveTagIds([]);
    setActiveBand(null);
  };

  // ----- Tag family slices for FilterDropdown -------------------------------
  const mealTimeTags = tags.filter((t: Tag) => t.family === 'meal-time');
  const cyclePhaseTags = tags.filter((t: Tag) => t.family === 'cycle-phase');
  const dietaryTags = tags.filter((t: Tag) => t.family === 'dietary');
  const nutrientTags = tags.filter((t: Tag) => t.family === 'nutrient');

  // ----- Filtered + sorted recipe list -------------------------------------
  const { suggested, others } = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = recipes.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      // AND across every active tag id: recipe must have it in mealRoleIds OR tagIds
      const recipeTagIds = [...r.mealRoleIds, ...r.tagIds];
      const matchesTags = activeTagIds.every((id) => recipeTagIds.includes(id));
      const matchesBand =
        activeBand === null || recipeMacros(r, foods).kcal <= activeBand;
      return matchesQuery && matchesTags && matchesBand;
    });

    const suggested = filtered.filter((r) =>
      r.mealRoleIds.includes(mealRoleId),
    );
    const others = filtered.filter((r) => !r.mealRoleIds.includes(mealRoleId));

    return { suggested, others };
  }, [recipes, foods, query, activeTagIds, activeBand, mealRoleId]);

  const total = suggested.length + others.length;
  const roleLabel = MEAL_ROLE_LABEL[mealRoleId] ?? mealRoleId;

  // ----- Handlers -----------------------------------------------------------
  const handlePick = (recipeId: string) => {
    onPick(recipeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:max-w-2xl max-h-[85vh] overflow-hidden"
        aria-label="Choose a recipe"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border rounded-field shrink-0">
          <DialogTitle className="text-base font-semibold text-text-primary">
            Choose a recipe
          </DialogTitle>
          <DialogDescription>for {roleLabel}</DialogDescription>
        </DialogHeader>

        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-border rounded-field shrink-0 space-y-2.5">
          {/* Search */}
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            aria-label="Search recipes by name"
            size="sm"
          />

          {/* Dropdown filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Meal-time"
              options={mealTimeTags.map((t: Tag) => ({
                value: t.id,
                label: t.label,
              }))}
              selected={activeTagIds.filter((id) =>
                mealTimeTags.some((t: Tag) => t.id === id),
              )}
              onToggle={toggleTag}
            />
            <FilterDropdown
              label={TAG_FAMILY_LABELS['cycle-phase']}
              options={cyclePhaseTags.map((t: Tag) => ({
                value: t.id,
                label: t.label,
              }))}
              selected={activeTagIds.filter((id) =>
                cyclePhaseTags.some((t: Tag) => t.id === id),
              )}
              onToggle={toggleTag}
            />
            <FilterDropdown
              label={TAG_FAMILY_LABELS['dietary']}
              options={dietaryTags.map((t: Tag) => ({
                value: t.id,
                label: t.label,
              }))}
              selected={activeTagIds.filter((id) =>
                dietaryTags.some((t: Tag) => t.id === id),
              )}
              onToggle={toggleTag}
            />
            <FilterDropdown
              label={TAG_FAMILY_LABELS['nutrient']}
              options={nutrientTags.map((t: Tag) => ({
                value: t.id,
                label: t.label,
              }))}
              selected={activeTagIds.filter((id) =>
                nutrientTags.some((t: Tag) => t.id === id),
              )}
              onToggle={toggleTag}
            />
            <FilterDropdown
              label="Calories"
              options={CALORIE_BANDS.map((b) => ({
                value: String(b),
                label: `Under ${b} kcal`,
              }))}
              selected={activeBand !== null ? [String(activeBand)] : []}
              onToggle={(v) =>
                setActiveBand((prev) => (prev === Number(v) ? null : Number(v)))
              }
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={clearFilters}
                className="gap-1 text-text-secondary hover:text-text-primary"
              >
                <X size={13} aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Recipe results */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {total === 0 ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center justify-center py-16 gap-2 text-center"
              >
                <p className="text-sm font-medium text-text-primary">
                  No recipes found
                </p>
                <p className="text-xs text-text-secondary">
                  Try adjusting your search or clearing some filters.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div
                role="list"
                aria-label="Recipe results"
                className="space-y-4"
              >
                {/* Suggested for this meal */}
                {suggested.length > 0 && (
                  <section aria-label={`Suggested for ${roleLabel}`}>
                    <p className={`mb-2 ${LABEL_CLASS}`}>
                      Suggested for {roleLabel}
                    </p>
                    <ul className="space-y-2 list-none p-0 m-0">
                      {suggested.map((recipe) => (
                        <li key={recipe.id} role="listitem">
                          <RecipePickerCard
                            recipe={recipe}
                            foods={foods}
                            tags={tags}
                            isCurrent={recipe.id === currentRecipeId}
                            isAlt={alternativeRecipeIds.includes(recipe.id)}
                            onPick={handlePick}
                            onToggleAlt={onToggleAlt}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Other recipes */}
                {others.length > 0 && (
                  <section aria-label="Other recipes">
                    {suggested.length > 0 && (
                      <p className={`mb-2 ${LABEL_CLASS}`}>Other recipes</p>
                    )}
                    <ul className="space-y-2 list-none p-0 m-0">
                      {others.map((recipe) => (
                        <li key={recipe.id} role="listitem">
                          <RecipePickerCard
                            recipe={recipe}
                            foods={foods}
                            tags={tags}
                            isCurrent={recipe.id === currentRecipeId}
                            isAlt={alternativeRecipeIds.includes(recipe.id)}
                            onPick={handlePick}
                            onToggleAlt={onToggleAlt}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// RecipePickerCard — individual recipe card in the picker
// ---------------------------------------------------------------------------

interface RecipePickerCardProps {
  recipe: import('../../../context/NutritionContext').Recipe;
  foods: import('../../../context/NutritionContext').Food[];
  tags: import('../../../context/NutritionContext').Tag[];
  isCurrent: boolean;
  isAlt: boolean;
  onPick: (recipeId: string) => void;
  onToggleAlt: (recipeId: string, isCurrentlyAlt: boolean) => void;
}

function RecipePickerCard({
  recipe,
  foods,
  tags,
  isCurrent,
  isAlt,
  onPick,
  onToggleAlt,
}: RecipePickerCardProps) {
  const macros = recipeMacros(recipe, foods);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  const recipeTags = [
    ...recipe.mealRoleIds.map((id) => tags.find((t) => t.id === id)),
    ...recipe.tagIds.map((id) => tags.find((t) => t.id === id)),
  ].filter((t): t is Tag => Boolean(t));

  return (
    <article
      aria-label={recipe.name}
      className={`flex gap-3 rounded-control border p-3 transition-colors ${
        isCurrent
          ? 'border-primary/40 bg-primary-soft'
          : 'border-border bg-card hover:bg-surface-muted'
      }`}
    >
      {/* Thumbnail */}
      <RecipeVisual
        recipe={recipe}
        className="h-16 w-16 shrink-0 rounded-compact"
        iconSize={22}
      />

      {/* Body */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Name + cook time */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-text-primary leading-tight truncate">
            {recipe.name}
          </p>
          {totalMinutes > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-secondary">
              <Clock size={11} aria-hidden="true" />
              {totalMinutes} min
            </span>
          )}
        </div>

        {/* Macros */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span className="font-medium text-text-primary tabular-nums">
            {macros.kcal} kcal
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${MACRO_DOT.protein}`}
              aria-hidden="true"
            />
            {macros.protein}g P
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${MACRO_DOT.carb}`}
              aria-hidden="true"
            />
            {macros.carb}g C
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${MACRO_DOT.fat}`}
              aria-hidden="true"
            />
            {macros.fat}g F
          </span>
        </div>

        {/* Tags */}
        {recipeTags.length > 0 && (
          <ul
            className="flex flex-wrap gap-1 list-none p-0 m-0"
            aria-label="Recipe tags"
          >
            {recipeTags.slice(0, 4).map((t) => (
              <li key={t.id}>
                <TagPill tag={t} />
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2.5">
          {isCurrent ? (
            <Badge variant="success" role="status">
              <Check size={13} aria-hidden="true" />
              Current meal
            </Badge>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onPick(recipe.id)}
              aria-label={`Set ${recipe.name} as the meal`}
              className="h-7 px-3 text-xs"
            >
              Set as meal
            </Button>
          )}

          {/* Swap-option toggle — adds this recipe as a client-selectable alternative */}
          {!isCurrent && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onToggleAlt(recipe.id, isAlt)}
              aria-pressed={isAlt}
              aria-label={
                isAlt
                  ? `Remove ${recipe.name} as a swap option`
                  : `Add ${recipe.name} as a swap option`
              }
              className={cn(
                'h-7 gap-1 rounded-compact px-2.5 text-xs font-medium',
                isAlt &&
                  'border-primary/30 bg-primary-soft text-primary hover:bg-primary-soft',
              )}
            >
              {isAlt ? (
                <>
                  <Check size={11} aria-hidden="true" />
                  Swap option
                </>
              ) : (
                <>
                  <Plus size={11} aria-hidden="true" />
                  Swap option
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
