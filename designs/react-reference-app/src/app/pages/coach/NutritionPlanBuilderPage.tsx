import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, CheckCircle2, Plus, RotateCcw, ShoppingCart, Shuffle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, seedDailyTarget, recipeMacros, slotMacros, isoLocal, recipeConflicts,
  groupSiblings, rescaleGrams, shoppingList,
} from '../../context/NutritionContext';
import type { PlanDay, MealSlot, ClientNutritionPlan, Recipe, Food, ClientFoodPreferences, BlockReview, ShoppingGroup } from '../../context/NutritionContext';
import type { CyclePhase } from '../../context/CycleContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useAppState } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach/nutrition/plan-constants';
import { CATEGORY_LABELS, CATEGORY_SWATCH, MACRO_DOT, MACRO_BAR } from '../../components/coach/nutrition/nutrition-constants';
import { RecipeVisual } from '../../components/coach/nutrition/RecipeVisual';

export function NutritionPlanBuilderPage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getPlan, createBlock, carryOverBlock, setSlotRecipe, setSlotPortion, copyDayToPhase, setPhaseTargetOverride, addSlotAlternative, removeSlotAlternative, setSlotIngredientSwap, clearSlotIngredientSwap, getPreferences, recipes, foods } = useNutrition();
  const { getPhaseForDate } = useCycle();
  const { getProfile } = useClientProfile();
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const { appState, setAppState } = useAppState();
  const { nutritionBlockCompleted, nutritionPreferenceConflict } = appState;

  const profile = getProfile(clientId);
  const plan = getPlan(clientId);
  const block = plan?.blocks.find((b) => b.status === 'active');
  const prefs = getPreferences(clientId);

  // Master-detail: which day is shown in the spacious editor
  const todayIso = isoLocal(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Will be re-evaluated by the effect below when block loads
    return todayIso;
  });

  // Keep selectedDate in sync with the block: if selectedDate is not in the
  // current block (e.g. after carry-over or auto-create), fall back to day[0].
  useEffect(() => {
    if (!block) return;
    const dates = block.days.map((d) => d.date);
    if (!dates.includes(selectedDate)) {
      setSelectedDate(dates[0] ?? todayIso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block?.id]); // only when block identity changes

  const selectedDay = block?.days.find((d) => d.date === selectedDate);

  // Derive effective prefs: when the preference-conflict toggle is on, union food-salmon
  // into the disliked set so salmon slots show the soft-warning. Never mutates context state.
  const effectivePrefs: typeof prefs = nutritionPreferenceConflict
    ? {
        clientId: prefs?.clientId ?? clientId,
        dislikedFoodIds: [...(prefs?.dislikedFoodIds ?? []), 'food-salmon'],
        allergens: prefs?.allergens ?? [],
        dietaryFlags: prefs?.dietaryFlags ?? [],
      }
    : prefs;

  // Determine if we're in block-review state:
  // 1. Real state: the most-recent block is past AND has a review.
  // 2. Dev toggle: nutritionBlockCompleted is on AND there's an active block — use a mocked review.
  const mostRecentBlock = plan?.blocks[plan.blocks.length - 1];
  const realReviewBlock = mostRecentBlock?.status === 'past' && mostRecentBlock.review ? mostRecentBlock : undefined;

  const mockedReview = {
    adherencePct: 82,
    swapsUsed: 3,
    clientFeedbackNote: 'Felt great in the follicular phase; struggled with dinners pre-period.',
  };

  // When the dev toggle is on and there's an active block (but no real review block), show
  // the review panel for the active block using the mocked review data.
  const devReviewBlock = nutritionBlockCompleted && block && !realReviewBlock
    ? { ...block, review: mockedReview }
    : undefined;

  const reviewBlock = realReviewBlock ?? devReviewBlock;

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

  // Auto-create on mount when there is no active block and no review block awaiting action.
  // The ref prevents a second call on the re-render that follows createBlock's state update.
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (autoCreatedRef.current) return;        // already fired once this mount
    if (!clientId) return;                     // no client — nothing to do
    if (block) return;                         // block already exists
    if (reviewBlock) return;                   // review panel is showing — coach must choose
    // Guard: only auto-create when there is enough context (profile preferred, but not required)
    autoCreatedRef.current = true;
    handleCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, block, reviewBlock]);          // re-evaluates if deps change; ref prevents double-create

  const handleCarryOver = () => {
    if (!reviewBlock) return;
    carryOverBlock(clientId, reviewBlock.id, computeNextPhases());
    setAppState({ nutritionBlockCompleted: false });
  };

  const handleStartNew = () => {
    if (!plan) return;
    createBlock(clientId, plan.dailyTarget, computeNextPhases());
    setAppState({ nutritionBlockCompleted: false });
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
        <div className="ml-auto flex items-center gap-2">
          {block && (
            <Dialog open={shoppingListOpen} onOpenChange={setShoppingListOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5" aria-label="Open shopping list for this block">
                  <ShoppingCart size={15} aria-hidden="true" />
                  Shopping list
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Shopping list</DialogTitle>
                  <DialogDescription>
                    {format(parseISO(block.startDate), 'MMM d')}–{format(parseISO(block.days.at(-1)!.date), 'MMM d')}
                  </DialogDescription>
                </DialogHeader>
                <ShoppingListBody groups={shoppingList(block, recipes, foods)} />
              </DialogContent>
            </Dialog>
          )}
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
            <p className="mt-10 text-center text-sm text-muted-foreground">Preparing plan…</p>
          )
        ) : (
          <div className="space-y-4">
            {[0, 1].map((week) => (
              <section key={week} aria-label={`Week ${week + 1}`}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Week {week + 1}</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
                  {block.days.slice(week * 7, week * 7 + 7).map((day) => (
                    <DayOverviewCell
                      key={day.date}
                      day={day}
                      plan={plan!}
                      recipes={recipes}
                      foods={foods}
                      isSelected={day.date === selectedDate}
                      onSelect={setSelectedDate}
                    />
                  ))}
                </div>
              </section>
            ))}
            {selectedDay && (
              <DayEditor
                day={selectedDay}
                plan={plan!}
                recipes={recipes}
                foods={foods}
                prefs={effectivePrefs}
                onPick={onPick}
                onPortion={onPortion}
                onClear={onClear}
                onApplyPhase={onApplyPhase}
                onAddAlt={onAddAlt}
                onRemoveAlt={onRemoveAlt}
                onSetSwap={onSetSwap}
                onClearSwap={onClearSwap}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shopping list dialog body
// ---------------------------------------------------------------------------

interface ShoppingListBodyProps {
  groups: ShoppingGroup[];
}

function ShoppingListBody({ groups }: ShoppingListBodyProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No ingredients yet — fill some slots to see the shopping list.</p>
    );
  }
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.category} aria-label={CATEGORY_LABELS[group.category]}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_SWATCH[group.category]}`}
              aria-hidden="true"
            />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {CATEGORY_LABELS[group.category]}
            </h3>
          </div>
          <ul className="space-y-1 list-none p-0 m-0">
            {group.items.map((item) => (
              <li key={item.foodId} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted">
                <span>{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.grams} g</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
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

// ---------------------------------------------------------------------------
// Overview calendar cell — compact, selectable
// ---------------------------------------------------------------------------

interface DayOverviewCellProps {
  day: PlanDay;
  plan: ClientNutritionPlan;
  recipes: Recipe[];
  foods: Food[];
  isSelected: boolean;
  onSelect: (date: string) => void;
}

function DayOverviewCell({ day, plan, recipes, foods, isSelected, onSelect }: DayOverviewCellProps) {
  const target = dayTargetFor(plan, day.phase);
  const totals = dayMacros(day, recipes, foods);
  const filledCount = day.slots.filter((s) => s.recipeId).length;
  const totalSlots = day.slots.length;
  const kcalPct = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;
  const over = totals.kcal > target.kcal;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-pressed={isSelected}
      aria-label={`${format(parseISO(day.date), 'EEEE, MMM d')}${day.phase ? ' — ' + PHASE_LABEL[day.phase] : ''}, ${filledCount} of ${totalSlots} meals set, ${totals.kcal} of ${target.kcal} kcal`}
      className={`flex w-full flex-col rounded-xl border bg-card text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? 'border-[var(--brand)] ring-1 ring-[var(--brand)] shadow-sm'
          : 'border-border hover:border-muted-foreground/40 hover:shadow-sm'
      }`}
    >
      {/* Date + phase accent */}
      <div
        className="flex items-center justify-between gap-1 rounded-t-xl px-2.5 py-1.5"
        style={
          day.phase
            ? {
                borderBottom: `1px solid color-mix(in srgb, ${PHASE_VAR[day.phase]} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${PHASE_VAR[day.phase]} 10%, transparent)`,
              }
            : { borderBottom: '1px solid transparent' }
        }
      >
        <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--brand)]' : 'text-foreground'}`}>
          {format(parseISO(day.date), 'EEE d')}
        </span>
        {day.phase && (
          <span className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: PHASE_VAR[day.phase] }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-muted-foreground">{PHASE_LABEL[day.phase].slice(0, 3)}</span>
          </span>
        )}
      </div>

      {/* Mini calorie meter */}
      <div className="px-2.5 pt-2 pb-1">
        <div className="mb-1 flex items-center justify-between">
          <span className={`text-[10px] tabular-nums font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
            {totals.kcal} / {target.kcal}
          </span>
          <span className="text-[10px] text-muted-foreground">kcal</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-macro-kcal'}`}
            style={{ width: `${Math.round(kcalPct * 100)}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Meals-set indicator: small dots per slot */}
      <div className="px-2.5 pb-2 flex items-center gap-1" aria-hidden="true">
        {day.slots.map((s) => (
          <span
            key={s.id}
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.recipeId ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filledCount}/{totalSlots}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Day editor — single meal row (full-width, all editing inline)
// ---------------------------------------------------------------------------

interface DayEditorMealRowProps {
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

function DayEditorMealRow({
  slot, date, recipes, foods, prefs,
  onPick, onPortion, onClear, onAddAlt, onRemoveAlt, onSetSwap, onClearSwap,
}: DayEditorMealRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const recipe = slot.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined;
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;
  const macros = recipe ? slotMacros(slot, recipes, foods) : null;
  const conflicts = recipe ? recipeConflicts(recipe, prefs, foods) : [];
  const hasConflict = conflicts.length > 0;

  const searchLower = search.toLowerCase();
  const filteredRecipes = recipes
    .filter((r) => !searchLower || r.name.toLowerCase().includes(searchLower))
    .sort((a, b) => {
      const aMatch = a.mealRoleIds.includes(slot.mealRoleId) ? 0 : 1;
      const bMatch = b.mealRoleIds.includes(slot.mealRoleId) ? 0 : 1;
      return aMatch - bMatch;
    });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Row header: role + soft budget */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{roleLabel}</h3>
        <span className="text-xs text-muted-foreground">~{slot.suggestedKcal} kcal</span>
      </div>

      {recipe ? (
        /* ── FILLED SLOT ── */
        <div className="space-y-4">
          {/* Recipe identity: thumbnail + name + macros + conflict */}
          <div className="flex gap-3">
            <RecipeVisual
              recipe={recipe}
              className="h-14 w-14 shrink-0 rounded-lg"
              iconSize={22}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{recipe.name}</p>
              {macros && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{macros.kcal} kcal</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${MACRO_DOT.protein}`} aria-hidden="true" />
                    {macros.protein}g P
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${MACRO_DOT.carb}`} aria-hidden="true" />
                    {macros.carb}g C
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${MACRO_DOT.fat}`} aria-hidden="true" />
                    {macros.fat}g F
                  </span>
                </div>
              )}
            </div>
            {/* Remove button */}
            <button
              type="button"
              aria-label={`Remove ${recipe.name}`}
              onClick={() => onClear(date, slot.id)}
              className="shrink-0 self-start rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          {/* Preference conflict warning */}
          {hasConflict && (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-foreground">
              <AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              Client dislikes: {conflicts.join(', ')}
            </p>
          )}

          {/* Portion slider — INLINE */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground" htmlFor={`portion-inline-${slot.id}`}>
                Portion
              </label>
              <span className="text-xs font-medium text-foreground tabular-nums">{slot.portionScale}×</span>
            </div>
            <input
              id={`portion-inline-${slot.id}`}
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
              <span>2×</span>
            </div>
          </div>

          {/* Ingredient swaps — INLINE (reuse component) */}
          <IngredientSwaps
            slot={slot}
            date={date}
            recipe={recipe}
            foods={foods}
            onSetSwap={onSetSwap}
            onClearSwap={onClearSwap}
          />

          {/* Alternatives */}
          {slot.alternativeRecipeIds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Alternatives</p>
              <div className="flex flex-wrap gap-1.5">
                {slot.alternativeRecipeIds.map((altId) => {
                  const altRecipe = recipes.find((r) => r.id === altId);
                  return altRecipe ? (
                    <span
                      key={altId}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
                    >
                      <Shuffle size={10} aria-hidden="true" />
                      {altRecipe.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Change recipe popover */}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                aria-label={`Change recipe for ${roleLabel}`}
              >
                Change recipe
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start" aria-label="Pick a recipe">
              <RecipeList
                recipes={filteredRecipes}
                search={search}
                onSearch={setSearch}
                mealRoleId={slot.mealRoleId}
                currentRecipeId={recipe.id}
                alternativeRecipeIds={slot.alternativeRecipeIds}
                onPick={(recipeId) => { onPick(date, slot.id, recipeId); setPickerOpen(false); }}
                onToggleAlt={(recipeId, isAlt) => {
                  if (isAlt) onRemoveAlt(date, slot.id, recipeId);
                  else onAddAlt(date, slot.id, recipeId);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        /* ── EMPTY SLOT ── */
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Add a meal for ${roleLabel}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={16} aria-hidden="true" />
              Add a meal
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start" aria-label="Pick a recipe">
            <RecipeList
              recipes={filteredRecipes}
              search={search}
              onSearch={setSearch}
              mealRoleId={slot.mealRoleId}
              currentRecipeId={undefined}
              alternativeRecipeIds={slot.alternativeRecipeIds}
              onPick={(recipeId) => { onPick(date, slot.id, recipeId); setPickerOpen(false); }}
              onToggleAlt={(recipeId, isAlt) => {
                if (isAlt) onRemoveAlt(date, slot.id, recipeId);
                else onAddAlt(date, slot.id, recipeId);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day editor — full-width editor for the selected day
// ---------------------------------------------------------------------------

interface DayEditorProps {
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

function DayEditor({
  day, plan, recipes, foods, prefs,
  onPick, onPortion, onClear, onApplyPhase, onAddAlt, onRemoveAlt, onSetSwap, onClearSwap,
}: DayEditorProps) {
  const target = dayTargetFor(plan, day.phase);
  const totals = dayMacros(day, recipes, foods);
  const over = totals.kcal > target.kcal;
  const kcalPct = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;
  const proteinPct = target.protein > 0 ? Math.min(1, totals.protein / target.protein) : 0;
  const carbPct = target.carb > 0 ? Math.min(1, totals.carb / target.carb) : 0;
  const fatPct = target.fat > 0 ? Math.min(1, totals.fat / target.fat) : 0;
  const hasFilledSlot = day.slots.some((s) => s.recipeId);

  return (
    <section
      aria-label={`Day editor — ${format(parseISO(day.date), 'EEEE, MMM d')}`}
      className="mt-6 rounded-2xl border border-border bg-card p-5"
    >
      {/* Day editor header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-lg text-foreground">
            {format(parseISO(day.date), 'EEEE, MMM d')}
          </h2>
          {day.phase && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-foreground"
              style={{
                backgroundColor: `color-mix(in srgb, ${PHASE_VAR[day.phase]} 18%, transparent)`,
                border: `1px solid color-mix(in srgb, ${PHASE_VAR[day.phase]} 40%, transparent)`,
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PHASE_VAR[day.phase] }}
                aria-hidden="true"
              />
              {PHASE_LABEL[day.phase]}
            </span>
          )}
        </div>
        {/* Apply to phase button */}
        {day.phase && hasFilledSlot && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyPhase(day.date)}
            aria-label={`Apply ${format(parseISO(day.date), 'EEE d')} to all ${PHASE_LABEL[day.phase]} days`}
          >
            Apply to all {PHASE_LABEL[day.phase]} days
          </Button>
        )}
      </div>

      {/* Prominent day macro meter */}
      <div className="mb-6 rounded-xl border border-border bg-surface-subtle p-4 space-y-3">
        {/* Calories */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Calories</span>
            <span className={`text-sm font-semibold tabular-nums ${over ? 'text-destructive' : 'text-foreground'}`}>
              {totals.kcal} / {target.kcal} kcal
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : MACRO_BAR.kcal}`}
              style={{ width: `${Math.round(kcalPct * 100)}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Protein / Carb / Fat */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', value: totals.protein, target: target.protein, pct: proteinPct, bar: MACRO_BAR.protein, dot: MACRO_DOT.protein },
            { label: 'Carbs', value: totals.carb, target: target.carb, pct: carbPct, bar: MACRO_BAR.carb, dot: MACRO_DOT.carb },
            { label: 'Fat', value: totals.fat, target: target.fat, pct: fatPct, bar: MACRO_BAR.fat, dot: MACRO_DOT.fat },
          ].map(({ label, value, target: t, pct, bar, dot }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${bar}`}
                  style={{ width: `${Math.round(pct * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {value}g / {t}g
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Meal rows */}
      <div className="space-y-3">
        {day.slots.map((slot) => (
          <DayEditorMealRow
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
    </section>
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
