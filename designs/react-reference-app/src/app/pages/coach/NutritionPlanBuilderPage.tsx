import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, CheckCircle2, Plus, RotateCcw, Shuffle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, seedDailyTarget, recipeMacros, isoLocal, recipeConflicts,
  groupSiblings, rescaleGrams,
} from '../../context/NutritionContext';
import type { PlanDay, MealSlot, ClientNutritionPlan, Recipe, Food, ClientFoodPreferences, BlockReview } from '../../context/NutritionContext';
import type { CyclePhase } from '../../context/CycleContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach/nutrition/plan-constants';

export function NutritionPlanBuilderPage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getPlan, createBlock, carryOverBlock, setSlotRecipe, setSlotPortion, copyDayToPhase, setPhaseTargetOverride, addSlotAlternative, removeSlotAlternative, setSlotIngredientSwap, clearSlotIngredientSwap, getPreferences, recipes, foods } = useNutrition();
  const { getPhaseForDate } = useCycle();
  const { getProfile } = useClientProfile();

  const profile = getProfile(clientId);
  const plan = getPlan(clientId);
  const block = plan?.blocks.find((b) => b.status === 'active');
  const prefs = getPreferences(clientId);

  // Determine if we're in block-review state: the most-recent block is past AND has a review
  const mostRecentBlock = plan?.blocks[plan.blocks.length - 1];
  const reviewBlock = mostRecentBlock?.status === 'past' && mostRecentBlock.review ? mostRecentBlock : undefined;

  // Helper: compute 14 day-phases starting from today (or the day after a given offset)
  const computeNextPhases = () =>
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return getPhaseForDate(clientId, isoLocal(d)) ?? undefined;
    });

  const handleCreate = () => {
    const target = profile ? seedDailyTarget(profile) : { kcal: 2000, protein: 150, carb: 200, fat: 65 };
    createBlock(clientId, target, computeNextPhases());
  };

  const handleCarryOver = () => {
    if (!reviewBlock) return;
    carryOverBlock(clientId, reviewBlock.id, computeNextPhases());
  };

  const handleStartNew = () => {
    if (!plan) return;
    createBlock(clientId, plan.dailyTarget, computeNextPhases());
  };

  const onPick = (date: string, slotId: string, recipeId: string) =>
    setSlotRecipe(clientId, block!.id, date, slotId, recipeId);

  const onPortion = (date: string, slotId: string, scale: number) =>
    setSlotPortion(clientId, block!.id, date, slotId, scale);

  const onClear = (date: string, slotId: string) =>
    setSlotRecipe(clientId, block!.id, date, slotId, undefined);

  const onApplyPhase = (date: string) =>
    copyDayToPhase(clientId, block!.id, date);

  const onAddAlt = (date: string, slotId: string, recipeId: string) =>
    addSlotAlternative(clientId, block!.id, date, slotId, recipeId);

  const onRemoveAlt = (date: string, slotId: string, recipeId: string) =>
    removeSlotAlternative(clientId, block!.id, date, slotId, recipeId);

  const onSetSwap = (date: string, slotId: string, fromFoodId: string, toFoodId: string) =>
    setSlotIngredientSwap(clientId, block!.id, date, slotId, fromFoodId, toFoodId);

  const onClearSwap = (date: string, slotId: string, fromFoodId: string) =>
    clearSlotIngredientSwap(clientId, block!.id, date, slotId, fromFoodId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
        <button onClick={() => navigate('/coach/nutrition')} aria-label="Back to Nutrition"
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-serif text-lg text-foreground">{profile?.name ?? 'Client'} · Nutrition plan</h1>
        <div className="ml-auto">
          <Button variant="outline" onClick={() => navigate('/coach/nutrition')}>Done</Button>
        </div>
      </header>

      {block && (() => {
        const distinctPhases = [...new Set(block.days.map((d) => d.phase).filter((p): p is CyclePhase => Boolean(p)))];
        if (distinctPhases.length === 0) return null;
        return (
          <div className="shrink-0 border-b border-border bg-card px-4 py-2 lg:px-6" role="group" aria-label="Per-phase calorie targets">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Phase kcal targets</p>
            <div className="flex flex-wrap gap-3">
              {distinctPhases.map((phase) => {
                const effective = dayTargetFor(plan!, phase);
                const hasOverride = Boolean(plan!.phaseTargetOverrides?.[phase]);
                const inputId = `phase-kcal-${phase}`;
                return (
                  <div key={phase} className="flex items-center gap-1.5">
                    <label htmlFor={inputId} className="text-xs text-foreground whitespace-nowrap">
                      {PHASE_LABEL[phase]} kcal
                    </label>
                    <input
                      id={inputId}
                      type="number"
                      min={500}
                      max={5000}
                      step={50}
                      value={effective.kcal}
                      aria-label={`${PHASE_LABEL[phase]} calorie target`}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val >= 500) {
                          setPhaseTargetOverride(clientId, phase, { ...plan!.dailyTarget, ...plan!.phaseTargetOverrides?.[phase], kcal: val });
                        }
                      }}
                      className="w-20 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {hasOverride && (
                      <button
                        type="button"
                        aria-label={`Reset ${PHASE_LABEL[phase]} calorie target to default`}
                        onClick={() => setPhaseTargetOverride(clientId, phase, null)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <RotateCcw size={12} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {reviewBlock && (
          <BlockReviewPanel
            review={reviewBlock.review!}
            onCarryOver={handleCarryOver}
            onStartNew={handleStartNew}
          />
        )}
        {!block ? (
          !reviewBlock && (
            <div className="mx-auto mt-20 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-serif text-xl text-foreground">No active plan</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Build a 2-week, cycle-aware block. Days are auto-stamped from {profile?.name ?? 'the client'}'s cycle.
              </p>
              <Button className="mt-5" onClick={handleCreate}>Create 2-week block</Button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {[0, 1].map((week) => (
              <section key={week} aria-label={`Week ${week + 1}`}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Week {week + 1}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                  {block.days.slice(week * 7, week * 7 + 7).map((day) => (
                    <DayColumn
                      key={day.date}
                      day={day}
                      plan={plan!}
                      recipes={recipes}
                      foods={foods}
                      prefs={prefs}
                      onPick={onPick}
                      onPortion={onPortion}
                      onClear={onClear}
                      onApplyPhase={onApplyPhase}
                      onAddAlt={onAddAlt}
                      onRemoveAlt={onRemoveAlt}
                      onSetSwap={onSetSwap}
                      onClearSwap={onClearSwap}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block review panel
// ---------------------------------------------------------------------------

interface BlockReviewPanelProps {
  review: BlockReview;
  onCarryOver: () => void;
  onStartNew: () => void;
}

function BlockReviewPanel({ review, onCarryOver, onStartNew }: BlockReviewPanelProps) {
  return (
    <section
      aria-label="Block review"
      className="mx-auto mb-6 max-w-lg rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={18} className="text-success shrink-0" aria-hidden="true" />
        <h2 className="font-serif text-lg text-foreground">Block review</h2>
      </div>

      <dl className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Adherence</dt>
          <dd className="text-2xl font-semibold text-success">{review.adherencePct}%</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Swaps used</dt>
          <dd className="text-2xl font-semibold text-foreground">{review.swapsUsed}</dd>
        </div>
      </dl>

      {review.clientFeedbackNote && (
        <blockquote className="mb-5 rounded-xl border border-border bg-surface-subtle px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Client feedback</p>
          <p className="text-sm text-foreground">{review.clientFeedbackNote}</p>
        </blockquote>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          onClick={onCarryOver}
        >
          Carry over
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={onStartNew}
        >
          Start new block
        </Button>
      </div>
    </section>
  );
}

interface DayColumnProps {
  day: PlanDay;
  plan: ClientNutritionPlan;
  recipes: Recipe[];
  foods: Food[];
  prefs: ClientFoodPreferences | undefined;
  onPick: (date: string, slotId: string, recipeId: string) => void;
  onPortion: (date: string, slotId: string, scale: number) => void;
  onClear: (date: string, slotId: string) => void;
  onApplyPhase: (date: string) => void;
  onAddAlt: (date: string, slotId: string, recipeId: string) => void;
  onRemoveAlt: (date: string, slotId: string, recipeId: string) => void;
  onSetSwap: (date: string, slotId: string, fromFoodId: string, toFoodId: string) => void;
  onClearSwap: (date: string, slotId: string, fromFoodId: string) => void;
}

function DayColumn({ day, plan, recipes, foods, prefs, onPick, onPortion, onClear, onApplyPhase, onAddAlt, onRemoveAlt, onSetSwap, onClearSwap }: DayColumnProps) {
  const target = dayTargetFor(plan, day.phase);
  const totals = dayMacros(day, recipes, foods);
  const over = totals.kcal > target.kcal;
  return (
    <div
      role="group"
      aria-label={`${format(parseISO(day.date), 'EEE d')}${day.phase ? ' – ' + PHASE_LABEL[day.phase] : ''}`}
      className="flex flex-col rounded-xl border border-border bg-card"
    >
      <div
        className="rounded-t-xl border-l-4 px-3 py-2"
        style={day.phase ? {
          borderColor: PHASE_VAR[day.phase],
          backgroundColor: `color-mix(in srgb, ${PHASE_VAR[day.phase]} 14%, transparent)`,
        } : undefined}
      >
        <p className="text-xs font-semibold text-foreground">{format(parseISO(day.date), 'EEE d')}</p>
        {day.phase && <p className="text-xs font-medium text-foreground">{PHASE_LABEL[day.phase]}</p>}
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        {day.slots.map((slot) => (
          <SlotCell
            key={slot.id}
            slot={slot}
            date={day.date}
            recipes={recipes}
            foods={foods}
            prefs={prefs}
            onPick={onPick}
            onPortion={onPortion}
            onClear={onClear}
            onAddAlt={onAddAlt}
            onRemoveAlt={onRemoveAlt}
            onSetSwap={onSetSwap}
            onClearSwap={onClearSwap}
          />
        ))}
      </div>
      <p className={`border-t border-border px-3 py-1.5 text-[11px] font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
        {totals.kcal} / {target.kcal} kcal
      </p>
      {day.phase && day.slots.some((s) => s.recipeId) && (
        <Button
          variant="ghost"
          size="sm"
          className="m-2 mt-0 text-[11px]"
          aria-label={`Apply ${format(parseISO(day.date), 'EEE d')} to all ${PHASE_LABEL[day.phase]} days`}
          onClick={() => onApplyPhase(day.date)}
        >
          Apply to all {PHASE_LABEL[day.phase]} days
        </Button>
      )}
    </div>
  );
}

interface SlotCellProps {
  slot: MealSlot;
  date: string;
  recipes: Recipe[];
  foods: Food[];
  prefs: ClientFoodPreferences | undefined;
  onPick: (date: string, slotId: string, recipeId: string) => void;
  onPortion: (date: string, slotId: string, scale: number) => void;
  onClear: (date: string, slotId: string) => void;
  onAddAlt: (date: string, slotId: string, recipeId: string) => void;
  onRemoveAlt: (date: string, slotId: string, recipeId: string) => void;
  onSetSwap: (date: string, slotId: string, fromFoodId: string, toFoodId: string) => void;
  onClearSwap: (date: string, slotId: string, fromFoodId: string) => void;
}

function SlotCell({ slot, date, recipes, foods, prefs, onPick, onPortion, onClear, onAddAlt, onRemoveAlt, onSetSwap, onClearSwap }: SlotCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const recipe = slot.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined;
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;
  const slotKcal = recipe ? Math.round(recipeMacros(recipe, foods).kcal * slot.portionScale) : 0;

  // Preference conflict check for filled slots
  const conflicts = recipe ? recipeConflicts(recipe, prefs, foods) : [];
  const hasConflict = conflicts.length > 0;

  // Alternatives badge
  const altCount = slot.alternativeRecipeIds.length;
  const altNames = slot.alternativeRecipeIds
    .map((id) => recipes.find((r) => r.id === id)?.name ?? id)
    .join(', ');

  // Sort recipes: matching mealRoleId first, then others; filter by search
  const searchLower = search.toLowerCase();
  const filteredRecipes = recipes
    .filter((r) => !searchLower || r.name.toLowerCase().includes(searchLower))
    .sort((a, b) => {
      const aMatch = a.mealRoleIds.includes(slot.mealRoleId) ? 0 : 1;
      const bMatch = b.mealRoleIds.includes(slot.mealRoleId) ? 0 : 1;
      return aMatch - bMatch;
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={`${roleLabel} — ${recipe ? recipe.name : 'add a recipe'}`}
          className="w-full rounded-lg bg-muted px-2 py-1.5 text-left transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] font-medium text-foreground">{roleLabel}</p>
            <div className="flex items-center gap-1 mt-0.5 shrink-0">
              {hasConflict && (
                <AlertTriangle
                  size={12}
                  className="text-amber-600 dark:text-amber-400"
                  aria-label={`Contains ${conflicts.join(', ')} — client dislikes this`}
                  title={`Contains ${conflicts.join(', ')} — client dislikes this`}
                />
              )}
              {altCount > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-helper"
                  aria-label={`${altCount} alternative${altCount > 1 ? 's' : ''}`}
                  title={altNames}
                >
                  <Shuffle size={10} aria-hidden="true" />
                  {altCount}
                </span>
              )}
              {!recipe && (
                <Plus size={12} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </div>
          {recipe ? (
            <p className="text-[11px] text-muted-foreground">{recipe.name} · {slotKcal} kcal</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">~{slot.suggestedKcal} kcal</p>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3" align="start" aria-label="Pick a recipe">
        {recipe ? (
          /* Filled slot: show controls */
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground truncate">{recipe.name}</p>
              <button
                aria-label={`Remove ${recipe.name}`}
                onClick={() => { onClear(date, slot.id); setOpen(false); }}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            {hasConflict && (
              <p className="flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={11} aria-hidden="true" />
                Client dislikes: {conflicts.join(', ')}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">{slotKcal} kcal at {slot.portionScale}× portion</p>
            <div className="space-y-1">
              <label className="sr-only" htmlFor={`portion-${slot.id}`}>
                Portion for {roleLabel}
              </label>
              <input
                id={`portion-${slot.id}`}
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={slot.portionScale}
                onChange={(e) => onPortion(date, slot.id, Number(e.target.value))}
                className="w-full accent-primary"
                aria-valuetext={`${slot.portionScale}×`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.5×</span>
                <span className="font-medium text-foreground">{slot.portionScale}×</span>
                <span>2×</span>
              </div>
            </div>
            {/* Ingredient swaps section */}
            <IngredientSwaps
              slot={slot}
              date={date}
              recipe={recipe}
              foods={foods}
              onSetSwap={onSetSwap}
              onClearSwap={onClearSwap}
            />
            <button
              className="w-full rounded-md border border-border py-1 text-[11px] text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen(false)}
            >
              Change recipe
            </button>
            {/* Show recipe list below for swapping + alternative toggles */}
            <RecipeList
              recipes={filteredRecipes}
              search={search}
              onSearch={setSearch}
              mealRoleId={slot.mealRoleId}
              currentRecipeId={recipe.id}
              alternativeRecipeIds={slot.alternativeRecipeIds}
              onPick={(recipeId) => { onPick(date, slot.id, recipeId); setOpen(false); }}
              onToggleAlt={(recipeId, isAlt) => {
                if (isAlt) onRemoveAlt(date, slot.id, recipeId);
                else onAddAlt(date, slot.id, recipeId);
              }}
            />
          </div>
        ) : (
          /* Empty slot: show recipe picker + alternative toggles */
          <RecipeList
            recipes={filteredRecipes}
            search={search}
            onSearch={setSearch}
            mealRoleId={slot.mealRoleId}
            currentRecipeId={undefined}
            alternativeRecipeIds={slot.alternativeRecipeIds}
            onPick={(recipeId) => { onPick(date, slot.id, recipeId); setOpen(false); }}
            onToggleAlt={(recipeId, isAlt) => {
              if (isAlt) onRemoveAlt(date, slot.id, recipeId);
              else onAddAlt(date, slot.id, recipeId);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface IngredientSwapsProps {
  slot: MealSlot;
  date: string;
  recipe: Recipe;
  foods: Food[];
  onSetSwap: (date: string, slotId: string, fromFoodId: string, toFoodId: string) => void;
  onClearSwap: (date: string, slotId: string, fromFoodId: string) => void;
}

function IngredientSwaps({ slot, date, recipe, foods, onSetSwap, onClearSwap }: IngredientSwapsProps) {
  // Find ingredients that have equivalence-group siblings
  const swappableIngredients = recipe.ingredients
    .map((ing) => {
      const originalFood = foods.find((f) => f.id === ing.foodId);
      if (!originalFood) return null;
      const siblings = groupSiblings(originalFood, foods);
      if (siblings.length === 0) return null;
      return { ing, originalFood, siblings };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (swappableIngredients.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Swaps</p>
      {swappableIngredients.map(({ ing, originalFood, siblings }) => {
        // The swap key is always the ORIGINAL recipe ingredient's foodId
        const activeSwapId = slot.ingredientSwaps?.[ing.foodId];
        const activeFood = activeSwapId ? foods.find((f) => f.id === activeSwapId) : undefined;
        const displayGrams = activeFood
          ? rescaleGrams(originalFood, activeFood, ing.grams)
          : ing.grams;
        const displayName = activeFood ? activeFood.name : originalFood.name;

        return (
          <div key={ing.foodId} className="rounded-md bg-muted/60 px-2 py-1.5 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-medium text-foreground truncate">
                {displayName}
                <span className="ml-1 font-normal text-muted-foreground">· {displayGrams} g</span>
              </span>
              {activeSwapId && (
                <button
                  type="button"
                  aria-label={`Revert ${originalFood.name} swap to original`}
                  onClick={() => onClearSwap(date, slot.id, ing.foodId)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                </button>
              )}
            </div>
            <select
              aria-label={`Swap ${originalFood.name} for an equivalent`}
              value={activeSwapId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  onClearSwap(date, slot.id, ing.foodId);
                } else {
                  onSetSwap(date, slot.id, ing.foodId, val);
                }
              }}
              className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{originalFood.name} (original · {ing.grams} g)</option>
              {siblings.map((sibling) => {
                const rescaled = rescaleGrams(originalFood, sibling, ing.grams);
                return (
                  <option key={sibling.id} value={sibling.id}>
                    {sibling.name} · {rescaled} g
                  </option>
                );
              })}
            </select>
          </div>
        );
      })}
    </div>
  );
}

interface RecipeListProps {
  recipes: Recipe[];
  search: string;
  onSearch: (s: string) => void;
  mealRoleId: string;
  currentRecipeId: string | undefined;
  alternativeRecipeIds: string[];
  onPick: (recipeId: string) => void;
  onToggleAlt: (recipeId: string, isCurrentlyAlt: boolean) => void;
}

function RecipeList({ recipes, search, onSearch, mealRoleId, currentRecipeId, alternativeRecipeIds, onPick, onToggleAlt }: RecipeListProps) {
  const preferred = recipes.filter((r) => r.mealRoleIds.includes(mealRoleId));
  const others = recipes.filter((r) => !r.mealRoleIds.includes(mealRoleId));

  function RecipeRow({ r }: { r: Recipe }) {
    const isPrimary = r.id === currentRecipeId;
    const isAlt = alternativeRecipeIds.includes(r.id);
    // Don't show the alt toggle for the current primary recipe
    const showAltToggle = !isPrimary;
    return (
      <li key={r.id}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPick(r.id)}
            aria-pressed={isPrimary}
            className={`flex-1 rounded px-2 py-1 text-left text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isPrimary
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            {r.name}
          </button>
          {showAltToggle && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleAlt(r.id, isAlt); }}
              aria-pressed={isAlt}
              aria-label={isAlt ? `Remove ${r.name} as alternative` : `Add ${r.name} as alternative`}
              title={isAlt ? `Remove ${r.name} as alternative` : `Add ${r.name} as alternative`}
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isAlt
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {isAlt ? (
                <span className="inline-flex items-center gap-0.5"><Shuffle size={9} aria-hidden="true" /> alt</span>
              ) : (
                <span className="inline-flex items-center gap-0.5"><Plus size={9} aria-hidden="true" /> alt</span>
              )}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search recipes…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="h-7 text-[11px]"
        aria-label="Search recipes"
      />
      <ul className="max-h-48 overflow-y-auto space-y-0.5 list-none p-0 m-0">
        {preferred.length > 0 && preferred.map((r) => (
          <RecipeRow key={r.id} r={r} />
        ))}
        {others.length > 0 && (
          <>
            {preferred.length > 0 && (
              <li role="presentation">
                <p className="px-2 pt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Other</p>
              </li>
            )}
            {others.map((r) => (
              <RecipeRow key={r.id} r={r} />
            ))}
          </>
        )}
        {recipes.length === 0 && (
          <li>
            <p className="px-2 py-2 text-[11px] text-muted-foreground">No recipes found.</p>
          </li>
        )}
      </ul>
    </div>
  );
}
