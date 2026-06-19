import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ShoppingCart, Clock, Utensils as UtensilsIcon } from 'lucide-react';
import {
  useNutrition,
  dayMacros,
  dayTargetFor,
  slotMacros,
  shoppingList,
  isoLocal,
} from '../../context/NutritionContext';
import type { PlanDay, MealSlot } from '../../context/NutritionContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach/nutrition/plan-constants';
import {
  CATEGORY_LABELS,
  CATEGORY_SWATCH,
  COOKING_METHOD_LABELS,
} from '../../components/coach/nutrition/nutrition-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function localToday(): string {
  return isoLocal(new Date());
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
// Slot card with coach-approved swaps
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: MealSlot;
  day: PlanDay;
  blockId: string;
  onSwap: (slotId: string, recipeId: string) => void;
}

function SlotCard({ slot, day, blockId, onSwap }: SlotCardProps) {
  const { recipes, foods, setSlotRecipe } = useNutrition();
  const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;

  // All options for this slot: current primary + alternatives (if any)
  const allOptionIds = slot.recipeId
    ? [slot.recipeId, ...slot.alternativeRecipeIds.filter((id) => id !== slot.recipeId)]
    : slot.alternativeRecipeIds;

  const handleSwap = (recipeId: string) => {
    onSwap(slot.id, recipeId);
    setSlotRecipe('client-1', blockId, day.date, slot.id, recipeId);
  };

  // Cook time and methods for the displayed recipe (slot.recipeId is the source of truth after swaps)
  const displayRecipe = slot.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined;
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

  return (
    <article
      className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
      aria-label={`${roleLabel} meal`}
    >
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">
          {roleLabel}
        </p>

        {displayRecipe ? (
          <>
            <p className="font-semibold text-sm text-[#121212] leading-snug mb-2">
              {displayRecipe.name}
            </p>
            {macros && (
              <p className="text-xs text-neutral-500 tabular-nums mb-2">
                {macros.kcal} kcal · P {macros.protein}g · C {macros.carb}g · F {macros.fat}g
              </p>
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
          </>
        ) : (
          <p className="text-sm text-neutral-400 italic">No meal set</p>
        )}
      </div>

      {/* Coach-approved swaps: only show the alternatives the coach set */}
      {allOptionIds.length > 1 && (
        <div className="px-4 pb-3 pt-1 border-t border-neutral-50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Coach-approved alternatives
          </p>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={`Alternative meals for ${roleLabel}`}>
            {allOptionIds.map((rid) => {
              const r = recipes.find((rec) => rec.id === rid);
              if (!r) return null;
              const isSelected = rid === effectiveSelectedId;
              return (
                <button
                  key={rid}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSwap(rid)}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81D6B]/40 ${
                    isSelected
                      ? 'bg-[#C81D6B]/8 text-[#C81D6B] border border-[#C81D6B]/30'
                      : 'bg-neutral-50 text-[#121212] border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span className="block">{r.name}</span>
                  {isSelected && (
                    <span className="text-[10px] font-normal text-[#C81D6B]/80">Selected</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
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
// Main page
// ---------------------------------------------------------------------------

export function ClientNutrition() {
  const { getPlan, recipes, foods } = useNutrition();
  const plan = getPlan('client-1');
  const block = plan?.blocks.find((b) => b.status === 'active');

  const today = localToday();

  // Selected day state — default to today in the block, fall back to first day
  const defaultDay = block?.days.find((d) => d.date === today) ?? block?.days[0];
  const [selectedDate, setSelectedDate] = useState<string>(defaultDay?.date ?? today);
  const [shoppingOpen, setShoppingOpen] = useState(false);

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

  const handleSlotSwap = (_slotId: string, _recipeId: string) => {
    // swap is handled directly in SlotCard via setSlotRecipe
  };

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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-sm font-semibold text-[#121212] hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81D6B]/40 shrink-0"
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
                  className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 min-w-[56px] text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81D6B]/40 ${
                    isSelected
                      ? 'bg-[#C81D6B] text-white shadow-md'
                      : isToday
                      ? 'bg-[#C81D6B]/8 text-[#C81D6B] border border-[#C81D6B]/20'
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

            {/* Day macro meter */}
            {dayTotals && (
              <div className="px-5 py-4 border-b border-neutral-50 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Daily totals
                </h3>
                <MacroBar
                  value={dayTotals.kcal}
                  max={target.kcal}
                  colorClass="bg-[#C81D6B]"
                  label="Calories (kcal)"
                />
                <div className="grid grid-cols-3 gap-3">
                  <MacroBar
                    value={dayTotals.protein}
                    max={target.protein}
                    colorClass="bg-nutrition-protein"
                    label="Protein (g)"
                  />
                  <MacroBar
                    value={dayTotals.carb}
                    max={target.carb}
                    colorClass="bg-nutrition-carb"
                    label="Carbs (g)"
                  />
                  <MacroBar
                    value={dayTotals.fat}
                    max={target.fat}
                    colorClass="bg-nutrition-fat"
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
                  day={selectedDay}
                  blockId={block.id}
                  onSwap={handleSlotSwap}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
