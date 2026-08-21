import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ShoppingCart, Clock, Utensils as UtensilsIcon, TrendingDown, TrendingUp, ArrowLeftRight, Check } from 'lucide-react';
import {
  useNutrition,
  dayMacros,
  dayTargetFor,
  slotMacros,
  recipeMacros,
  shoppingList,
  isoLocal,
  effectiveRecipeId,
} from '../../context/NutritionContext';
import type { MealSlot, Recipe, Food } from '../../context/NutritionContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach-portal/nutrition/plan-constants';
import {
  CATEGORY_LABELS,
  CATEGORY_SWATCH,
  COOKING_METHOD_LABELS,
  MACRO_BAR,
  MACRO_DOT,
} from '../../components/coach-portal/nutrition/nutrition-constants';
import { useClientProfile } from '../../context/ClientProfileContext';
import { ResponsiveSheetDialog } from '../../components/workout/ResponsiveSheetDialog';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { RecipeVisual } from '../../components/coach-portal/nutrition/RecipeVisual';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function localToday(): string {
  return isoLocal(new Date());
}

// ---------------------------------------------------------------------------
// Macro dot helper
// ---------------------------------------------------------------------------

interface MacroDotProps {
  colorClass: string;
}
function MacroDotSpan({ colorClass }: MacroDotProps) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${colorClass} shrink-0`}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Day macro meter bar
// ---------------------------------------------------------------------------

interface MacroBarProps {
  value: number;
  max: number;
  colorClass: string;
  label: string;
}

function MacroBar({ value, max, colorClass, label }: MacroBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#121212]">{label}</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value} of ${max}`}
      >
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recipe detail dialog body
// ---------------------------------------------------------------------------

interface RecipeDetailBodyProps {
  slot: MealSlot;
  recipe: Recipe;
  recipes: Recipe[];
  foods: Food[];
}

function RecipeDetailBody({ slot, recipe, recipes, foods }: RecipeDetailBodyProps) {
  const macros = slotMacros(slot, recipes, foods);
  const totalTime = recipe.prepMinutes + recipe.cookMinutes;
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;

  return (
    <div className="pb-8 overflow-y-auto">
      {/* Cover image / icon */}
      <RecipeVisual recipe={recipe} className="h-48 w-full rounded-t-2xl" />
      <div className="px-5 pt-4 md:px-8 space-y-5">
      {/* Macros */}
      <div className="bg-neutral-50 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Macros</p>
        <p className="text-sm font-semibold text-[#121212] tabular-nums">
          {macros.kcal.toLocaleString()} kcal
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-1 text-sm text-[#121212]">
            <MacroDotSpan colorClass={MACRO_DOT.protein} />
            P {macros.protein}g
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-[#121212]">
            <MacroDotSpan colorClass={MACRO_DOT.carb} />
            C {macros.carb}g
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-[#121212]">
            <MacroDotSpan colorClass={MACRO_DOT.fat} />
            F {macros.fat}g
          </span>
        </div>
      </div>

      {/* Time + role */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-neutral-600">
        {totalTime > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" />
            {totalTime} min
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <UtensilsIcon size={14} aria-hidden="true" />
          {roleLabel}
        </span>
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
          Ingredients
        </p>
        <ul className="space-y-1.5 list-none p-0 m-0">
          {recipe.ingredients.map((ing, i) => {
            const food = foods.find((f) => f.id === ing.foodId);
            const methodLabel = ing.method && ing.method in COOKING_METHOD_LABELS
              ? COOKING_METHOD_LABELS[ing.method as keyof typeof COOKING_METHOD_LABELS]
              : undefined;
            return (
              <li
                key={`${ing.foodId}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-[#121212] hover:bg-neutral-50"
              >
                <span className="flex-1">
                  {food?.name ?? ing.foodId}
                  {methodLabel && (
                    <span className="ml-1.5 text-xs text-neutral-400">· {methodLabel}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">{ing.grams} g</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* B — Instructions */}
      {recipe.instructions && recipe.instructions.trim().length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Instructions
          </p>
          <p className="text-sm text-[#121212] whitespace-pre-line leading-relaxed">
            {recipe.instructions}
          </p>
        </div>
      )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meal swap chooser dialog body
// ---------------------------------------------------------------------------

interface MealSwapChooserBodyProps {
  slot: MealSlot;
  optionIds: string[];
  selectedId: string | undefined;
  recipes: Recipe[];
  foods: Food[];
  onSelect: (recipeId: string) => void;
}

function MealSwapChooserBody({
  slot,
  optionIds,
  selectedId,
  recipes,
  foods,
  onSelect,
}: MealSwapChooserBodyProps) {
  return (
    <div className="px-5 pb-6 pt-2 md:px-8">
      <p className="text-xs text-neutral-400 mb-4">Coach-approved options</p>
      <ul className="space-y-2 list-none p-0 m-0" role="listbox" aria-label="Meal options">
        {optionIds.map((rid) => {
          const recipe = recipes.find((r) => r.id === rid);
          if (!recipe) return null;
          const isSelected = rid === selectedId;
          const isCoachPick = rid === slot.recipeId;
          const kcal = recipeMacros(recipe, foods).kcal;
          return (
            <li key={rid} role="option" aria-selected={isSelected}>
              <button
                type="button"
                aria-label={`${recipe.name}, ${kcal} kcal${isSelected ? ', currently selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(rid)}
                className={`w-full text-left rounded-xl px-4 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95134F]/40 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[#95134F]/8 border border-[#95134F]/25'
                    : 'bg-neutral-50 border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {/* Check indicator — always present for layout stability, visible only when selected */}
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#95134F] text-white' : 'bg-neutral-200'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check size={11} strokeWidth={2.5} />}
                </span>

                {/* Recipe thumbnail */}
                <RecipeVisual
                  recipe={recipe}
                  className="h-10 w-10 rounded-lg shrink-0"
                  iconSize={18}
                />

                {/* Name + kcal */}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-[#121212] leading-snug truncate">
                    {recipe.name}
                  </span>
                  <span className="text-xs text-neutral-500 tabular-nums">{kcal} kcal</span>
                </span>

                {/* Coach's pick — tiny muted label, not a badge */}
                {isCoachPick && (
                  <span className="shrink-0 text-[10px] text-neutral-400 font-medium">
                    Coach's pick
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot card with swap button — REVERSIBLE
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: MealSlot;
  recipes: Recipe[];
  foods: Food[];
  blockId: string;
  date: string;
  onViewRecipe: (slotId: string, recipeId: string) => void;
  onSelect: (slotId: string, recipeId: string) => void;
}

function SlotCard({ slot, recipes, foods, onViewRecipe, onSelect }: SlotCardProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;

  // Stable option list: coach primary first, then alternatives (deduped, order-preserved)
  const seen = new Set<string>();
  const allOptionIds: string[] = [];
  if (slot.recipeId) { seen.add(slot.recipeId); allOptionIds.push(slot.recipeId); }
  for (const id of slot.alternativeRecipeIds) {
    if (!seen.has(id)) { seen.add(id); allOptionIds.push(id); }
  }

  // Effective recipe drives all display
  const effectiveId = effectiveRecipeId(slot);
  const displayRecipe = effectiveId ? recipes.find((r) => r.id === effectiveId) : undefined;

  const cookTime = displayRecipe ? displayRecipe.prepMinutes + displayRecipe.cookMinutes : 0;
  const cookMethods = displayRecipe
    ? [
        ...new Set(
          displayRecipe.ingredients
            .map((ing) => ing.method)
            .filter((m): m is keyof typeof COOKING_METHOD_LABELS => m in COOKING_METHOD_LABELS),
        ),
      ]
    : [];

  const macros = displayRecipe ? slotMacros(slot, recipes, foods) : null;
  const hasSwaps = allOptionIds.length >= 2;

  const [pending, setPending] = useState<string | null>(null);
  const pendingRecipe = pending ? recipes.find((r) => r.id === pending) : undefined;

  // Picking an option closes the chooser and asks to confirm before changing the plan.
  const requestSwap = (recipeId: string) => {
    setSwapOpen(false);
    if (recipeId !== effectiveId) setPending(recipeId);
  };
  const confirmSwap = () => {
    if (pending) onSelect(slot.id, pending);
    setPending(null);
  };

  return (
    <>
      <article
        className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
        aria-label={`${roleLabel} meal`}
      >
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              {roleLabel}
            </p>
            {/* Swap button — only shown when there are alternatives */}
            {hasSwaps && (
              <button
                type="button"
                aria-label="Swap this meal"
                onClick={() => setSwapOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 hover:text-[#121212] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95134F]/40 shrink-0"
              >
                <ArrowLeftRight size={11} aria-hidden="true" />
                Swap
              </button>
            )}
          </div>

          {displayRecipe ? (
            <div className="flex items-start gap-3 min-w-0">
              {/* Thumbnail — effective recipe photo or meal icon */}
              <RecipeVisual
                recipe={displayRecipe}
                className="h-12 w-12 rounded-lg shrink-0"
                iconSize={20}
              />
              {/* Name, macros, cook info */}
              <div className="min-w-0 flex-1">
                {/* Recipe name as a button — opens the recipe detail dialog */}
                <button
                  type="button"
                  className="text-left mb-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95134F]/40 rounded"
                  aria-label={`View ${displayRecipe.name} recipe`}
                  onClick={() => onViewRecipe(slot.id, displayRecipe.id)}
                >
                  <p className="font-semibold text-sm text-[#121212] leading-snug group-hover:underline">
                    {displayRecipe.name}
                  </p>
                </button>
                {macros && (
                  <div className="flex items-center gap-2.5 flex-wrap mb-2 tabular-nums">
                    <span className="text-xs text-neutral-500">{macros.kcal} kcal</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#121212]">
                      <MacroDotSpan colorClass={MACRO_DOT.protein} />
                      P {macros.protein}g
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#121212]">
                      <MacroDotSpan colorClass={MACRO_DOT.carb} />
                      C {macros.carb}g
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#121212]">
                      <MacroDotSpan colorClass={MACRO_DOT.fat} />
                      F {macros.fat}g
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap text-xs text-neutral-500">
                  {cookTime > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} aria-hidden="true" />
                      {cookTime} min
                    </span>
                  )}
                  {cookMethods.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <UtensilsIcon size={12} aria-hidden="true" />
                      {cookMethods.map((m) => COOKING_METHOD_LABELS[m]).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 italic">No meal set</p>
          )}
        </div>
      </article>

      {/* Meal swap chooser — ResponsiveSheetDialog (drawer on mobile, dialog on desktop) */}
      {hasSwaps && (
        <ResponsiveSheetDialog
          open={swapOpen}
          onOpenChange={setSwapOpen}
          title="Swap this meal"
          description="Choose a coach-approved meal option"
        >
          <div className="px-5 pt-6 pb-2 md:px-8 md:pt-8">
            <h3 className="text-lg md:text-xl font-semibold text-[#121212] pr-10 leading-snug">
              Swap this meal
            </h3>
          </div>
          <MealSwapChooserBody
            slot={slot}
            optionIds={allOptionIds}
            selectedId={effectiveId}
            recipes={recipes}
            foods={foods}
            onSelect={requestSwap}
          />
        </ResponsiveSheetDialog>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={pendingRecipe ? `Switch ${roleLabel} to ${pendingRecipe.name}?` : 'Switch meal?'}
        description="This updates your plan for this day."
        confirmLabel="Switch meal"
        onConfirm={confirmSwap}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shopping list dialog body (mirrors NutritionPlanBuilderPage pattern)
// ---------------------------------------------------------------------------

interface ShoppingListBodyProps {
  groups: ReturnType<typeof shoppingList>;
}

function ShoppingListBody({ groups }: ShoppingListBodyProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No ingredients yet — your coach hasn't set any meals for this block.
      </p>
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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#121212]">
              {CATEGORY_LABELS[group.category]}
            </h3>
          </div>
          <ul className="space-y-1 list-none p-0 m-0">
            {group.items.map((item) => (
              <li
                key={item.foodId}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-[#121212] hover:bg-neutral-50"
              >
                <span>{item.name}</span>
                <span className="shrink-0 tabular-nums text-neutral-500">{item.grams} g</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// C — Goal-hero energy block
// ---------------------------------------------------------------------------

interface GoalHeroProps {
  primaryGoal: string;
  goalTarget: number;
  maintenanceCalories: number;
}

function GoalHero({ primaryGoal, goalTarget, maintenanceCalories }: GoalHeroProps) {
  const delta = goalTarget - maintenanceCalories;
  const isDeficit = delta < 0;
  const absDelta = Math.abs(delta);
  const DeltaIcon = isDeficit ? TrendingDown : TrendingUp;
  const deltaLabel = isDeficit
    ? `−${absDelta.toLocaleString()} kcal/day vs maintenance`
    : `+${absDelta.toLocaleString()} kcal/day vs maintenance`;

  return (
    <div className="px-5 py-5 border-b border-neutral-50">
      {/* Eyebrow: goal label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
        {primaryGoal}
      </p>

      {/* Hero: calorie target */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-4xl font-semibold text-[#121212] leading-none tabular-nums">
          {goalTarget.toLocaleString()}
        </span>
        <span className="text-sm font-medium text-neutral-400 leading-none">kcal/day</span>
      </div>

      {/* Secondary: deficit/surplus delta */}
      {delta !== 0 && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
          <DeltaIcon size={11} aria-hidden="true" />
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ClientNutrition() {
  const { getPlan, recipes, foods, setSlotSelection } = useNutrition();
  const { getProfile } = useClientProfile();
  const plan = getPlan('client-1');
  const profile = getProfile('client-1');
  const block = plan?.blocks.find((b) => b.status === 'active');

  const today = localToday();

  // Selected day state — default to today in the block, fall back to first day
  const defaultDay = block?.days.find((d) => d.date === today) ?? block?.days[0];
  const [selectedDate, setSelectedDate] = useState<string>(defaultDay?.date ?? today);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  // Recipe detail state — tracks { slotId, recipeId } of the open recipe
  const [openRecipe, setOpenRecipe] = useState<{ slotId: string; recipeId: string } | null>(null);

  const selectedDay = block?.days.find((d) => d.date === selectedDate) ?? block?.days[0];

  if (!plan || !block) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-12">
        <header className="mb-10">
          <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
            My nutrition
          </h1>
        </header>
        <div className="bg-white rounded-3xl border border-neutral-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <UtensilsIcon size={28} className="text-neutral-400" aria-hidden="true" />
          </div>
          <p className="font-serif text-xl text-[#121212] mb-2">No plan yet</p>
          <p className="text-sm text-neutral-500 max-w-xs mx-auto">
            Your coach hasn't built your plan yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const dayTotals = selectedDay ? dayMacros(selectedDay, recipes, foods) : null;
  const target = selectedDay ? dayTargetFor(plan, selectedDay.phase) : plan.dailyTarget;

  // A — slot selection: setSlotSelection keeps the coach's primary stable
  const handleSlotSelect = (slotId: string, recipeId: string) => {
    setSlotSelection('client-1', block.id, selectedDay!.date, slotId, recipeId);
  };

  const handleViewRecipe = (slotId: string, recipeId: string) => {
    setOpenRecipe({ slotId, recipeId });
  };

  // A — Resolve open recipe from the open slot (use effectiveRecipeId for accuracy)
  const openSlot = openRecipe
    ? selectedDay?.slots.find((s) => s.id === openRecipe.slotId)
    : undefined;
  // The modal always opens the recipe the user tapped (already the effective recipe at click time)
  const openRecipeData = openRecipe
    ? recipes.find((r) => r.id === openRecipe.recipeId)
    : undefined;

  // C — Goal-hero values
  const goalTarget = target.kcal;
  const primaryGoal = profile?.primaryGoal;

  return (
    <div className="w-full max-w-3xl mx-auto pb-12 space-y-6">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] tracking-tight">
            My nutrition
          </h1>
          <p className="text-neutral-500 font-medium mt-1">
            Your coach-built meal plan for this cycle block.
          </p>
        </div>
        <Dialog open={shoppingOpen} onOpenChange={setShoppingOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-sm font-semibold text-[#121212] hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95134F]/40 shrink-0"
              aria-label="Open shopping list for this meal block"
            >
              <ShoppingCart size={16} aria-hidden="true" />
              Shopping list
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Shopping list</DialogTitle>
              <DialogDescription>
                {format(parseISO(block.startDate), 'MMM d')}–
                {format(parseISO(block.days.at(-1)!.date), 'MMM d')} · full block
              </DialogDescription>
            </DialogHeader>
            <ShoppingListBody groups={shoppingList(block, recipes, foods)} />
          </DialogContent>
        </Dialog>
      </header>

      {/* Week strip */}
      <section aria-label="Week overview">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
          This block
        </h2>
        <div className="overflow-x-auto -mx-0.5 pb-1">
          <div className="inline-flex gap-2 px-0.5 min-w-max">
            {block.days.map((day) => {
              const isSelected = day.date === selectedDate;
              const isToday = day.date === today;
              const dayTotalsChip = dayMacros(day, recipes, foods);
              const phaseVar = day.phase ? PHASE_VAR[day.phase] : undefined;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  aria-label={`${format(parseISO(day.date), 'EEEE, MMMM d')}${day.phase ? `, ${PHASE_LABEL[day.phase]} phase` : ''}${isToday ? ', today' : ''}`}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 min-w-[56px] text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95134F]/40 ${
                    isSelected
                      ? 'bg-[#95134F] text-white shadow-md'
                      : isToday
                      ? 'bg-[#95134F]/8 text-[#95134F] border border-[#95134F]/20'
                      : 'bg-white text-[#121212] border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide leading-none">
                    {format(parseISO(day.date), 'EEE')}
                  </span>
                  <span className="text-base font-semibold leading-none">
                    {format(parseISO(day.date), 'd')}
                  </span>
                  {/* Phase color dot */}
                  {phaseVar && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: phaseVar }}
                      aria-hidden="true"
                    />
                  )}
                  {dayTotalsChip.kcal > 0 && (
                    <span className={`text-[9px] font-semibold tabular-nums leading-none ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                      {dayTotalsChip.kcal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selected day card */}
      {selectedDay && (
        <section aria-label={`Meals for ${format(parseISO(selectedDay.date), 'EEEE, MMMM d')}`}>
          <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
            {/* Day header */}
            <div
              className="px-5 py-4 border-b border-neutral-50"
              style={
                selectedDay.phase
                  ? {
                      borderLeft: `4px solid ${PHASE_VAR[selectedDay.phase]}`,
                      backgroundColor: `color-mix(in srgb, ${PHASE_VAR[selectedDay.phase]} 10%, transparent)`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-serif text-xl text-[#121212] font-semibold leading-none mb-1">
                    {format(parseISO(selectedDay.date), 'EEEE, MMMM d')}
                    {selectedDay.date === today && (
                      <span className="ml-2 text-xs font-sans font-semibold uppercase tracking-widest text-neutral-400">
                        Today
                      </span>
                    )}
                  </h2>
                  {selectedDay.phase && (
                    <p
                      className="inline-flex items-center gap-1.5 text-sm font-semibold"
                      style={{ color: PHASE_VAR[selectedDay.phase] }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PHASE_VAR[selectedDay.phase] }}
                        aria-hidden="true"
                      />
                      {PHASE_LABEL[selectedDay.phase]} phase
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* C — Goal-hero energy section (replaces old flat BMR/Maintenance/Target line) */}
            {profile && primaryGoal && (
              <GoalHero
                primaryGoal={primaryGoal}
                goalTarget={goalTarget}
                maintenanceCalories={profile.maintenanceCalories}
              />
            )}

            {/* Day macro meter */}
            {dayTotals && (
              <div className="px-5 py-4 border-b border-neutral-50 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Daily totals
                </h3>
                <MacroBar
                  value={dayTotals.kcal}
                  max={target.kcal}
                  colorClass={MACRO_BAR.kcal}
                  label="Calories (kcal)"
                />
                <div className="grid grid-cols-3 gap-3">
                  <MacroBar
                    value={dayTotals.protein}
                    max={target.protein}
                    colorClass={MACRO_BAR.protein}
                    label="Protein (g)"
                  />
                  <MacroBar
                    value={dayTotals.carb}
                    max={target.carb}
                    colorClass={MACRO_BAR.carb}
                    label="Carbs (g)"
                  />
                  <MacroBar
                    value={dayTotals.fat}
                    max={target.fat}
                    colorClass={MACRO_BAR.fat}
                    label="Fat (g)"
                  />
                </div>
              </div>
            )}

            {/* Meal slots */}
            <div className="px-5 py-4 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Meals
              </h3>
              {selectedDay.slots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  recipes={recipes}
                  foods={foods}
                  blockId={block.id}
                  date={selectedDay.date}
                  onSelect={handleSlotSelect}
                  onViewRecipe={handleViewRecipe}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recipe detail dialog */}
      {openSlot && openRecipeData && (
        <ResponsiveSheetDialog
          open={!!openRecipe}
          onOpenChange={(open) => { if (!open) setOpenRecipe(null); }}
          title={openRecipeData.name}
          description={`${MEAL_ROLE_LABEL[openSlot.mealRoleId] ?? openSlot.mealRoleId} recipe details`}
        >
          <div className="px-5 pt-6 pb-2 md:px-8 md:pt-8">
            <h3 className="text-lg md:text-xl font-semibold text-[#121212] pr-10 leading-snug">
              {openRecipeData.name}
            </h3>
          </div>
          <RecipeDetailBody
            slot={openSlot}
            recipe={openRecipeData}
            recipes={recipes}
            foods={foods}
          />
        </ResponsiveSheetDialog>
      )}
    </div>
  );
}
