import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, RotateCcw, ShoppingCart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, seedDailyTarget, isoLocal, shoppingList,
} from '../../context/NutritionContext';
import type { PlanDay, ClientNutritionPlan, Recipe, Food, BlockReview, ShoppingGroup } from '../../context/NutritionContext';
import type { CyclePhase } from '../../context/CycleContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useAppState } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR } from '../../components/coach/nutrition/plan-constants';
import { CATEGORY_LABELS, CATEGORY_SWATCH } from '../../components/coach/nutrition/nutrition-constants';

export function NutritionPlanBuilderPage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getPlan, createBlock, carryOverBlock, setPhaseTargetOverride, recipes, foods } = useNutrition();
  const { getPhaseForDate } = useCycle();
  const { getProfile } = useClientProfile();
  const [shoppingListOpen, setShoppingListOpen] = useState(false);

  const { appState, setAppState } = useAppState();
  const { nutritionBlockCompleted } = appState;

  const profile = getProfile(clientId);
  const plan = getPlan(clientId);
  const block = plan?.blocks.find((b) => b.status === 'active');

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
          <div className="shrink-0 border-b border-border bg-card px-4 py-3 lg:px-6" role="group" aria-label="Per-phase calorie targets">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phase targets</p>
              <p className="text-[11px] text-muted-foreground">
                Default <span className="font-semibold tabular-nums text-foreground">{plan!.dailyTarget.kcal}</span> kcal
              </p>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 list-none p-0 m-0">
              {distinctPhases.map((phase) => (
                <li key={phase}>
                  <PhaseTargetField
                    phase={phase}
                    effectiveKcal={dayTargetFor(plan!, phase).kcal}
                    hasOverride={Boolean(plan!.phaseTargetOverrides?.[phase])}
                    onCommit={(kcal) =>
                      setPhaseTargetOverride(clientId, phase, {
                        ...plan!.dailyTarget,
                        ...plan!.phaseTargetOverrides?.[phase],
                        kcal,
                      })
                    }
                    onReset={() => setPhaseTargetOverride(clientId, phase, null)}
                  />
                </li>
              ))}
            </ul>
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
                      clientId={clientId}
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
// PhaseTargetField — one editable per-phase calorie target
// ---------------------------------------------------------------------------

interface PhaseTargetFieldProps {
  phase: CyclePhase;
  effectiveKcal: number;
  hasOverride: boolean;
  onCommit: (kcal: number) => void;
  onReset: () => void;
}

function PhaseTargetField({ phase, effectiveKcal, hasOverride, onCommit, onReset }: PhaseTargetFieldProps) {
  const inputId = `phase-kcal-${phase}`;
  // Local draft so the coach can freely clear/retype; a controlled value tied straight to
  // the committed number snaps back on any interim value below the floor (the old bug).
  const [draft, setDraft] = useState(String(effectiveKcal));
  useEffect(() => {
    setDraft(String(effectiveKcal));
  }, [effectiveKcal]);

  const commit = () => {
    const val = Number(draft);
    if (!isNaN(val) && val >= 500 && val <= 5000) {
      if (val !== effectiveKcal) onCommit(val);
    } else {
      setDraft(String(effectiveKcal)); // revert invalid input
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: PHASE_VAR[phase] }}
          aria-hidden="true"
        />
        <label htmlFor={inputId} className="text-xs font-medium text-foreground whitespace-nowrap">
          {PHASE_LABEL[phase]}
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={500}
          max={5000}
          step={50}
          value={draft}
          aria-label={`${PHASE_LABEL[phase]} calorie target`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-xs tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-[11px] text-muted-foreground">kcal</span>
        {hasOverride && (
          <button
            type="button"
            aria-label={`Reset ${PHASE_LABEL[phase]} to the default target`}
            onClick={onReset}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        )}
      </div>
      <span className={`pl-3.5 text-[10px] ${hasOverride ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
        {hasOverride ? 'Overridden' : 'Inherits default'}
      </span>
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
  clientId: string;
}

function DayOverviewCell({ day, plan, recipes, foods, clientId }: DayOverviewCellProps) {
  const navigate = useNavigate();
  const target = dayTargetFor(plan, day.phase);
  const totals = dayMacros(day, recipes, foods);
  const filledCount = day.slots.filter((s) => s.recipeId).length;
  const totalSlots = day.slots.length;
  const kcalPct = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;
  const over = totals.kcal > target.kcal;

  return (
    <button
      type="button"
      onClick={() => navigate(`/coach/nutrition/client/${clientId}/plan/day/${day.date}`)}
      aria-label={`Edit ${format(parseISO(day.date), 'EEEE, MMM d')}${day.phase ? ' — ' + PHASE_LABEL[day.phase] : ''}, ${filledCount} of ${totalSlots} meals set, ${totals.kcal} of ${target.kcal} kcal`}
      className="flex w-full flex-col rounded-xl border bg-card text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-border hover:border-muted-foreground/40 hover:shadow-sm"
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
        <span className="text-xs font-semibold text-foreground">
          {format(parseISO(day.date), 'EEE d')}
        </span>
        {day.phase && (
          <span className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: PHASE_VAR[day.phase] }}
              aria-hidden="true"
            />
            <abbr title={PHASE_LABEL[day.phase]} className="text-[10px] text-muted-foreground no-underline">
              {PHASE_LABEL[day.phase].slice(0, 3)}
            </abbr>
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
        <div
          role="progressbar"
          aria-valuenow={totals.kcal}
          aria-valuemin={0}
          aria-valuemax={target.kcal}
          aria-label={`${format(parseISO(day.date), 'EEE d')} calories: ${totals.kcal} of ${target.kcal} kcal`}
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
        >
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

