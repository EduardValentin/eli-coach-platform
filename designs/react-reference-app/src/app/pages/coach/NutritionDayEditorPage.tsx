import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Plus, RotateCcw, Shuffle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, slotMacros, recipeConflicts,
  groupSiblings, rescaleGrams,
} from '../../context/NutritionContext';
import type { PlanDay, MealSlot, ClientNutritionPlan, Recipe, Food, ClientFoodPreferences } from '../../context/NutritionContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useAppState } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL, PHASE_NUDGE } from '../../components/coach/nutrition/plan-constants';
import { MACRO_DOT, MACRO_BAR } from '../../components/coach/nutrition/nutrition-constants';
import { RecipeVisual } from '../../components/coach/nutrition/RecipeVisual';
import { RecipePicker } from '../../components/coach/nutrition/RecipePicker';

export function NutritionDayEditorPage() {
  const { clientId = '', date = '' } = useParams<{ clientId: string; date: string }>();
  const navigate = useNavigate();

  const {
    getPlan, setSlotRecipe, setSlotPortion, copyDayToPhase,
    addSlotAlternative, removeSlotAlternative, setSlotIngredientSwap, clearSlotIngredientSwap,
    getPreferences, recipes, foods,
  } = useNutrition();
  const { getProfile } = useClientProfile();
  const { appState } = useAppState();
  const { nutritionPreferenceConflict } = appState;

  // Confirm-before-apply dialog for "Apply to all {phase} days".
  const [applyOpen, setApplyOpen] = useState(false);

  // Declare plan/block/day BEFORE any state or derived value that references them (TDZ guard).
  const plan = getPlan(clientId);
  const block = plan?.blocks.find((b) => b.status === 'active');
  const day = block?.days.find((d) => d.date === date);

  const profile = getProfile(clientId);
  const prefs = getPreferences(clientId);

  // Effective prefs: when the preference-conflict toggle is on, union food-salmon into disliked.
  const effectivePrefs: typeof prefs = nutritionPreferenceConflict
    ? {
        clientId: prefs?.clientId ?? clientId,
        dislikedFoodIds: [...(prefs?.dislikedFoodIds ?? []), 'food-salmon'],
        allergens: prefs?.allergens ?? [],
        dietaryFlags: prefs?.dietaryFlags ?? [],
      }
    : prefs;

  // Redirect to overview if block or day is missing.
  useEffect(() => {
    if (!block || !day) {
      navigate('/coach/nutrition/client/' + clientId + '/plan', { replace: true });
    }
  }, [block, day, clientId, navigate]);

  if (!block || !day) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-subtle">
        <p className="text-sm text-muted-foreground">Returning to plan…</p>
      </div>
    );
  }

  const backUrl = `/coach/nutrition/client/${clientId}/plan`;

  const onPick = (d: string, slotId: string, recipeId: string) =>
    setSlotRecipe(clientId, block.id, d, slotId, recipeId);

  const onPortion = (d: string, slotId: string, scale: number) =>
    setSlotPortion(clientId, block.id, d, slotId, scale);

  const onClear = (d: string, slotId: string) =>
    setSlotRecipe(clientId, block.id, d, slotId, undefined);

  // The Apply button now opens a confirm dialog (preview of affected days); the
  // copy only happens once the coach confirms.
  const onApplyPhase = () => setApplyOpen(true);
  const confirmApplyPhase = () => {
    copyDayToPhase(clientId, block.id, date);
    setApplyOpen(false);
    navigate(backUrl);
  };

  // Days the apply would touch — every other day sharing this day's phase, split
  // into "already has meals" (overwritten) vs "empty" (filled) for the preview.
  const phase = day.phase;
  const affectedDays = phase ? block.days.filter((d) => d.date !== date && d.phase === phase) : [];
  const overrideDays = affectedDays.filter((d) => d.slots.some((s) => s.recipeId));
  const emptyDays = affectedDays.filter((d) => !d.slots.some((s) => s.recipeId));
  const slotSummary = (d: PlanDay) =>
    d.slots
      .filter((s) => s.recipeId)
      .map((s) => recipes.find((r) => r.id === s.recipeId)?.name)
      .filter(Boolean)
      .join(' · ');

  const onAddAlt = (d: string, slotId: string, recipeId: string) =>
    addSlotAlternative(clientId, block.id, d, slotId, recipeId);

  const onRemoveAlt = (d: string, slotId: string, recipeId: string) =>
    removeSlotAlternative(clientId, block.id, d, slotId, recipeId);

  const onSetSwap = (d: string, slotId: string, fromFoodId: string, toFoodId: string) =>
    setSlotIngredientSwap(clientId, block.id, d, slotId, fromFoodId, toFoodId);

  const onClearSwap = (d: string, slotId: string, fromFoodId: string) =>
    clearSlotIngredientSwap(clientId, block.id, d, slotId, fromFoodId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
        <button
          onClick={() => navigate(backUrl)}
          aria-label="Back to plan"
          className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-serif text-lg text-foreground">
          {profile?.name ?? 'Client'} · {format(parseISO(date), 'EEEE, MMM d')}
        </h1>
      </header>

      <DayStrip
        days={block.days}
        currentDate={date}
        onSelect={(d) => navigate(`/coach/nutrition/client/${clientId}/plan/day/${d}`)}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <DayEditor
          day={day}
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
      </main>

      {phase && (
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-h-[80vh] gap-6 overflow-y-auto p-6 sm:max-w-md">
            <DialogHeader className="gap-2">
              <DialogTitle>Apply to all {PHASE_LABEL[phase]} days?</DialogTitle>
              <DialogDescription className="leading-relaxed">
                This copies {format(parseISO(date), 'EEEE, MMM d')}’s meals to {affectedDays.length} other{' '}
                {PHASE_LABEL[phase]} {affectedDays.length === 1 ? 'day' : 'days'} in this block.
              </DialogDescription>
            </DialogHeader>

            {affectedDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There are no other {PHASE_LABEL[phase]} days in this block.
              </p>
            ) : (
              <div className="space-y-6">
                {overrideDays.length > 0 && (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <AlertTriangle size={14} className="text-destructive" aria-hidden="true" />
                      Will be overwritten ({overrideDays.length})
                    </p>
                    <ul className="m-0 list-none space-y-2 p-0">
                      {overrideDays.map((d) => (
                        <li
                          key={d.date}
                          className="flex items-start justify-between gap-4 rounded-lg bg-muted/50 px-3.5 py-3"
                        >
                          <span className="shrink-0 text-xs font-medium text-foreground">
                            {format(parseISO(d.date), 'EEE, MMM d')}
                          </span>
                          <span className="min-w-0 text-right text-[11px] leading-relaxed text-muted-foreground">
                            {slotSummary(d)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {emptyDays.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground">Will be filled ({emptyDays.length})</p>
                    <ul className="m-0 list-none space-y-2 p-0">
                      {emptyDays.map((d) => (
                        <li
                          key={d.date}
                          className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3.5 py-3"
                        >
                          <span className="text-xs font-medium text-foreground">
                            {format(parseISO(d.date), 'EEE, MMM d')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">Empty</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-3 pt-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmApplyPhase} disabled={affectedDays.length === 0}>
                {affectedDays.length === 0
                  ? 'Nothing to apply'
                  : `Apply to ${affectedDays.length} ${affectedDays.length === 1 ? 'day' : 'days'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayStrip — compact, light day picker to cycle between days of the block
// ---------------------------------------------------------------------------

function DayStrip({
  days,
  currentDate,
  onSelect,
}: {
  days: PlanDay[];
  currentDate: string;
  onSelect: (date: string) => void;
}) {
  const idx = days.findIndex((d) => d.date === currentDate);
  const prev = idx > 0 ? days[idx - 1] : null;
  const next = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <nav
      aria-label="Day picker"
      className="flex shrink-0 items-center justify-center gap-1 border-b border-border bg-card px-2 py-1.5 lg:px-4"
    >
      <button
        type="button"
        onClick={() => prev && onSelect(prev.date)}
        disabled={!prev}
        aria-label={prev ? `Previous day, ${format(parseISO(prev.date), 'EEEE, MMM d')}` : 'No previous day'}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={18} />
      </button>

      <ul className="flex min-w-0 list-none gap-1 overflow-x-auto p-0 m-0">
        {days.map((d) => {
          const isCurrent = d.date === currentDate;
          return (
            <li key={d.date}>
              <button
                type="button"
                onClick={() => onSelect(d.date)}
                aria-current={isCurrent ? 'date' : undefined}
                aria-label={`${format(parseISO(d.date), 'EEEE, MMM d')}${d.phase ? `, ${PHASE_LABEL[d.phase]}` : ''}`}
                className={`flex min-w-[2.75rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-center transition-colors ${
                  isCurrent
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-[10px] font-medium uppercase leading-none">
                  {format(parseISO(d.date), 'EEEEEE')}
                </span>
                <span className="text-sm font-semibold leading-none tabular-nums">
                  {format(parseISO(d.date), 'd')}
                </span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={d.phase ? { backgroundColor: PHASE_VAR[d.phase] } : undefined}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => next && onSelect(next.date)}
        disabled={!next}
        aria-label={next ? `Next day, ${format(parseISO(next.date), 'EEEE, MMM d')}` : 'No next day'}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
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
      className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5"
    >
      {/* Day editor header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
      {/* Phase nudge — gentle informational hint, not a directive */}
      {day.phase && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PHASE_VAR[day.phase] }}
            aria-hidden="true"
          />
          {PHASE_NUDGE[day.phase]}
        </p>
      )}

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
          <div
            role="progressbar"
            aria-valuenow={totals.kcal}
            aria-valuemin={0}
            aria-valuemax={target.kcal}
            aria-label={`Calories: ${totals.kcal} of ${target.kcal} kcal`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
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
              <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={t}
                aria-label={`${label}: ${value} of ${t} g`}
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
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

  const recipe = slot.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined;
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;
  const macros = recipe ? slotMacros(slot, recipes, foods) : null;
  const conflicts = recipe ? recipeConflicts(recipe, prefs, foods) : [];
  const hasConflict = conflicts.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Row header: role + soft budget */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{roleLabel}</h2>
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

          {/* Ingredient swaps — INLINE */}
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

          {/* Change recipe — opens RecipePicker dialog */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            aria-label={`Change recipe for ${roleLabel}`}
            onClick={() => setPickerOpen(true)}
          >
            Change recipe
          </Button>
          <RecipePicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            mealRoleId={slot.mealRoleId}
            currentRecipeId={recipe.id}
            alternativeRecipeIds={slot.alternativeRecipeIds}
            onPick={(recipeId) => onPick(date, slot.id, recipeId)}
            onToggleAlt={(recipeId, isAlt) => {
              if (isAlt) onRemoveAlt(date, slot.id, recipeId);
              else onAddAlt(date, slot.id, recipeId);
            }}
          />
        </div>
      ) : (
        /* ── EMPTY SLOT ── */
        <>
          <button
            type="button"
            aria-label={`Add a meal for ${roleLabel}`}
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={16} aria-hidden="true" />
            Add a meal
          </button>
          <RecipePicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            mealRoleId={slot.mealRoleId}
            currentRecipeId={undefined}
            alternativeRecipeIds={slot.alternativeRecipeIds}
            onPick={(recipeId) => onPick(date, slot.id, recipeId)}
            onToggleAlt={(recipeId, isAlt) => {
              if (isAlt) onRemoveAlt(date, slot.id, recipeId);
              else onAddAlt(date, slot.id, recipeId);
            }}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingredient swaps
// ---------------------------------------------------------------------------

interface IngredientSwapsProps {
  slot: MealSlot;
  date: string;
  recipe: Recipe;
  foods: Food[];
  onSetSwap: (date: string, slotId: string, fromFoodId: string, toFoodId: string) => void;
  onClearSwap: (date: string, slotId: string, fromFoodId: string) => void;
}

function IngredientSwaps({ slot, date, recipe, foods, onSetSwap, onClearSwap }: IngredientSwapsProps) {
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
        const activeSwapId = slot.ingredientSwaps?.[ing.foodId];
        const activeFood = activeSwapId ? foods.find((f) => f.id === activeSwapId) : undefined;
        const displayGrams = activeFood
          ? rescaleGrams(originalFood, activeFood, ing.grams)
          : ing.grams;
        const displayName = activeFood ? activeFood.name : originalFood.name;

        const labelId = `swap-label-${slot.id}-${ing.foodId}`;
        const selectId = `swap-${slot.id}-${ing.foodId}`;
        return (
          <div key={ing.foodId} className="rounded-md bg-muted/60 px-2 py-1.5 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <label
                id={labelId}
                htmlFor={selectId}
                className="text-[11px] font-medium text-foreground truncate cursor-pointer"
              >
                {displayName}
                <span className="ml-1 font-normal text-muted-foreground">· {displayGrams} g</span>
              </label>
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
              id={selectId}
              aria-labelledby={labelId}
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

