import { useMemo, useState } from 'react';
import { Check, Clock, Plus, X } from 'lucide-react';
import {
  useNutrition,
  recipeMacros,
} from '../../../context/NutritionContext';
import type { Tag, TagFamily } from '../../../context/NutritionContext';
import { pickableItems } from '../../../domain/libraryLifecycle';
import { toggled } from '../../../utils/libraryListing';
import {
  CALORIE_BAND_LABELS,
  CALORIE_BAND_OPTIONS,
  type CalorieBand,
} from '../../../utils/recipeListing';
import { CountedMultiSelect } from '../../CountedMultiSelect';
import { CountedSelect } from '../../CountedSelect';
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

  const [query, setQuery] = useState('');
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [band, setBand] = useState<CalorieBand>('any');

  const toggleTag = (id: string) => setActiveTagIds((prev) => toggled(prev, id));

  const hasActiveFilters = activeTagIds.length > 0 || band !== 'any' || query.trim() !== '';

  const clearFilters = () => {
    setQuery('');
    setActiveTagIds([]);
    setBand('any');
  };

  const pickable = useMemo(
    () => pickableItems(recipes, [currentRecipeId, ...alternativeRecipeIds]),
    [recipes, currentRecipeId, alternativeRecipeIds],
  );

  const matching = (filters: { tagIds: readonly string[]; band: CalorieBand }) =>
    pickable.filter((r) => {
      const matchesQuery = !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase());
      const recipeTagIds = [...r.mealRoleIds, ...r.tagIds];
      const matchesTags = filters.tagIds.every((id) => recipeTagIds.includes(id));
      const matchesBand = filters.band === 'any' || recipeMacros(r, foods).kcal <= Number(filters.band);
      return matchesQuery && matchesTags && matchesBand;
    });

  const familyFilter = (family: TagFamily) => {
    const familyTags = tags.filter((t: Tag) => t.family === family);
    const familyIds = familyTags.map((t) => t.id);
    const others = matching({
      tagIds: activeTagIds.filter((id) => !familyIds.includes(id)),
      band,
    });
    return {
      label: TAG_FAMILY_LABELS[family],
      options: familyIds,
      labels: Object.fromEntries(familyTags.map((t) => [t.id, t.label])),
      selected: activeTagIds.filter((id) => familyIds.includes(id)),
      counts: Object.fromEntries(
        familyIds.map((id) => [
          id,
          others.filter((r) => [...r.mealRoleIds, ...r.tagIds].includes(id)).length,
        ]),
      ),
    };
  };

  const bandCounts = Object.fromEntries(
    CALORIE_BAND_OPTIONS.map((option) => [
      option,
      matching({ tagIds: activeTagIds, band: option }).length,
    ]),
  ) as Record<CalorieBand, number>;

  const filtered = matching({ tagIds: activeTagIds, band });
  const suggested = filtered.filter((r) => r.mealRoleIds.includes(mealRoleId));
  const others = filtered.filter((r) => !r.mealRoleIds.includes(mealRoleId));

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
            {(['meal-time', 'cycle-phase', 'dietary', 'nutrient'] as const).map((family) => {
              const filter = familyFilter(family);
              return (
                <div key={family} className="w-40">
                  <CountedMultiSelect
                    label={filter.label}
                    selected={filter.selected}
                    options={filter.options}
                    labels={filter.labels}
                    counts={filter.counts}
                    onToggle={toggleTag}
                  />
                </div>
              );
            })}
            <div className="w-40">
              <CountedSelect
                label="Calories"
                value={band}
                options={CALORIE_BAND_OPTIONS}
                labels={CALORIE_BAND_LABELS}
                counts={bandCounts}
                onChoose={setBand}
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost-muted"
                size="xs"
                onClick={clearFilters}
                className="gap-1"
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
            <Badge tone="success" role="status">
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
