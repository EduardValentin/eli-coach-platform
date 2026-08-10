import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Plus, RotateCcw, ShoppingCart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, slotMacros, seedDailyTarget, isoLocal, shoppingListForDays,
} from '../../context/NutritionContext';
import type { PlanDay, ClientNutritionPlan, PlanBlock, Recipe, Food, BlockReview, ShoppingGroup, DailyTarget } from '../../context/NutritionContext';
import type { CyclePhase } from '../../context/CycleContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { useAppState } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach-portal/nutrition/plan-constants';
import { CATEGORY_LABELS, CATEGORY_SWATCH } from '../../components/coach-portal/nutrition/nutrition-constants';
import { RecipeVisual } from '../../components/coach-portal/nutrition/RecipeVisual';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

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

  // Past blocks (most-recent first) the coach can switch to for read-only review.
  const pastBlocks = (plan?.blocks.filter((b) => b.status === 'past') ?? []).slice().reverse();
  // Which block is currently shown — null tracks the active block; otherwise a past block id.
  const [viewBlockId, setViewBlockId] = useState<string | null>(null);
  // Which week of the block the overview is showing (0 = week 1, 1 = week 2).
  const [week, setWeek] = useState(0);
  const viewedBlock = (viewBlockId ? plan?.blocks.find((b) => b.id === viewBlockId) : block) ?? block;
  const isViewingPast = viewedBlock?.status === 'past';

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
        {pastBlocks.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only">View plan block</span>
            <select
              aria-label="View plan block"
              value={viewedBlock?.id ?? ''}
              onChange={(e) => setViewBlockId(e.target.value === block?.id ? null : e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {block && <option value={block.id}>Current · {blockRange(block)}</option>}
              {pastBlocks.map((b) => (
                <option key={b.id} value={b.id}>Past · {blockRange(b)}</option>
              ))}
            </select>
          </label>
        )}
        {isViewingPast && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Past · read-only
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {viewedBlock && (
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
                    {format(parseISO(viewedBlock.startDate), 'MMM d')}–{format(parseISO(viewedBlock.days.at(-1)!.date), 'MMM d')}
                  </DialogDescription>
                </DialogHeader>
                <ShoppingListView block={viewedBlock} recipes={recipes} foods={foods} />
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={() => navigate('/coach/nutrition')}>Done</Button>
        </div>
      </header>

      {!isViewingPast && block && (
        <PhaseTargetsBar plan={plan!} clientId={clientId} onCommit={setPhaseTargetOverride} />
      )}

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {reviewBlock && (
          <BlockReviewPanel
            review={reviewBlock.review!}
            onCarryOver={handleCarryOver}
            onStartNew={handleStartNew}
          />
        )}
        {!viewedBlock ? (
          !reviewBlock && (
            <p className="mt-10 text-center text-sm text-muted-foreground">Preparing plan…</p>
          )
        ) : (
          <div className="space-y-5">
            {isViewingPast && viewedBlock.review && <PastReviewBanner review={viewedBlock.review} />}
            <PlanSummary block={viewedBlock} plan={plan!} recipes={recipes} foods={foods} />
            {(() => {
              const weekDays = viewedBlock.days.slice(week * 7, week * 7 + 7);
              const weekRange =
                weekDays.length > 0
                  ? `${format(parseISO(weekDays[0].date), 'MMM d')} – ${format(parseISO(weekDays.at(-1)!.date), 'MMM d')}`
                  : '';
              return (
                <section aria-label={`Week ${week + 1}`} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      role="group"
                      aria-label="Select week"
                      className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
                    >
                      {[0, 1].map((w) => (
                        <button
                          key={w}
                          type="button"
                          aria-pressed={week === w}
                          onClick={() => setWeek(w)}
                          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            week === w ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Week {w + 1}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{weekRange}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {weekDays.map((day, i) => {
                      const lastOdd = i === weekDays.length - 1 && weekDays.length % 2 === 1;
                      return (
                        <DayOverviewCell
                          key={day.date}
                          day={day}
                          plan={plan!}
                          recipes={recipes}
                          foods={foods}
                          clientId={clientId}
                          editable={!isViewingPast}
                          className={lastOdd ? 'sm:col-span-2' : undefined}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}

// Compact "MMM d – MMM d" range label for a block.
function blockRange(b: PlanBlock): string {
  return `${format(parseISO(b.startDate), 'MMM d')} – ${format(parseISO(b.days.at(-1)!.date), 'MMM d')}`;
}

// ---------------------------------------------------------------------------
// PastReviewBanner — read-only summary shown when reviewing a completed block
// ---------------------------------------------------------------------------

function PastReviewBanner({ review }: { review: BlockReview }) {
  return (
    <section
      aria-label="Block review"
      className="rounded-xl border border-border bg-muted/30 p-4"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Adherence</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{review.adherencePct}%</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Swaps used</p>
          <p className="text-base font-semibold tabular-nums text-foreground">{review.swapsUsed}</p>
        </div>
        {review.clientFeedbackNote && (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">Client feedback</p>
            <p className="text-sm text-foreground">“{review.clientFeedbackNote}”</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PlanSummary — at-a-glance stats above the calendar
// ---------------------------------------------------------------------------

interface PlanSummaryProps {
  block: PlanBlock;
  plan: ClientNutritionPlan;
  recipes: Recipe[];
  foods: Food[];
}

function PlanSummary({ block, plan, recipes, foods }: PlanSummaryProps) {
  const days = block.days;
  const n = days.length;

  let totalKcal = 0;
  let totalTarget = 0;
  let filled = 0;
  let slots = 0;
  const phaseCounts = new Map<CyclePhase, number>();
  for (const day of days) {
    totalKcal += dayMacros(day, recipes, foods).kcal;
    totalTarget += dayTargetFor(plan, day.phase).kcal;
    filled += day.slots.filter((s) => s.recipeId).length;
    slots += day.slots.length;
    if (day.phase) phaseCounts.set(day.phase, (phaseCounts.get(day.phase) ?? 0) + 1);
  }
  const avgKcal = n > 0 ? Math.round(totalKcal / n) : 0;
  const avgDiff = n > 0 ? Math.round((totalKcal - totalTarget) / n) : 0;
  const diffSign = avgDiff > 0 ? '+' : avgDiff < 0 ? '−' : '±';
  const range =
    n > 0 ? `${format(parseISO(days[0].date), 'MMM d')} – ${format(parseISO(days[n - 1].date), 'MMM d')}` : '';
  const orderedPhases = (Object.keys(PHASE_LABEL) as CyclePhase[]).filter((p) => phaseCounts.has(p));

  return (
    <section aria-label="Plan summary" className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Plan · {range} · {n} days
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] text-muted-foreground">Avg / day</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {avgKcal} <span className="text-[11px] font-normal text-muted-foreground">kcal</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Meals planned</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {filled} <span className="text-[11px] font-normal text-muted-foreground">/ {slots}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">Phases</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {orderedPhases.length > 0 ? (
              orderedPhases.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 text-xs text-foreground"
                  aria-label={`${PHASE_LABEL[p]}: ${phaseCounts.get(p)} days`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PHASE_VAR[p] }}
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">{phaseCounts.get(p)}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted-foreground">vs target</dt>
          <dd
            className={`mt-0.5 text-base font-semibold tabular-nums ${avgDiff > 0 ? 'text-destructive' : 'text-foreground'}`}
          >
            {diffSign}{Math.abs(avgDiff)} <span className="text-[11px] font-normal text-muted-foreground">avg</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PhaseTargetsBar — per-phase calorie targets, edited as a draft and committed
// via an explicit "Save targets" CTA + confirmation modal.
// ---------------------------------------------------------------------------

interface PhaseTargetsBarProps {
  plan: ClientNutritionPlan;
  clientId: string;
  onCommit: (clientId: string, phase: CyclePhase, target: DailyTarget | null) => void;
}

function PhaseTargetsBar({ plan, clientId, onCommit }: PhaseTargetsBarProps) {
  const block = plan.blocks.find((b) => b.status === 'active');
  const distinctPhases = block
    ? [...new Set(block.days.map((d) => d.phase).filter((p): p is CyclePhase => Boolean(p)))]
    : [];
  const defaultKcal = plan.dailyTarget.kcal;
  const effectiveKcal = (phase: CyclePhase) => dayTargetFor(plan, phase).kcal;

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (distinctPhases.length === 0) return null;

  const parsed = (phase: CyclePhase) => {
    const d = draft[phase];
    if (d === undefined) return effectiveKcal(phase);
    const n = Number(d);
    return d.trim() !== '' && !isNaN(n) ? n : effectiveKcal(phase);
  };
  const changes = distinctPhases
    .map((phase) => ({ phase, from: effectiveKcal(phase), to: parsed(phase) }))
    .filter((c) => c.to !== c.from && c.to >= 500 && c.to <= 5000);
  const dirty = changes.length > 0;

  const commit = () => {
    for (const { phase, to } of changes) {
      if (to === defaultKcal) onCommit(clientId, phase, null);
      else onCommit(clientId, phase, { ...plan.dailyTarget, ...plan.phaseTargetOverrides?.[phase], kcal: to });
    }
    setDraft({});
    setConfirmOpen(false);
  };

  return (
    <div className="shrink-0 border-b border-border bg-card px-4 py-3 lg:px-6" role="group" aria-label="Per-phase calorie targets">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phase targets</p>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-[11px] font-medium text-muted-foreground">Unsaved</span>}
          <p className="text-[11px] text-muted-foreground">
            Default <span className="font-semibold tabular-nums text-foreground">{defaultKcal}</span> kcal
          </p>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={!dirty}>
            Save targets
          </Button>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-3 list-none p-0 m-0">
        {distinctPhases.map((phase) => (
          <li key={phase}>
            <PhaseTargetField
              phase={phase}
              value={draft[phase] ?? String(effectiveKcal(phase))}
              defaultKcal={defaultKcal}
              onChange={(val) => setDraft((prev) => ({ ...prev, [phase]: val }))}
              onReset={() => setDraft((prev) => ({ ...prev, [phase]: String(defaultKcal) }))}
            />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Update phase targets?"
        description="This changes the daily calorie target for these cycle phases across the plan."
        confirmLabel="Save targets"
        confirmDisabled={!dirty}
        onConfirm={commit}
      >
        <ul className="m-0 list-none space-y-2 p-0">
          {changes.map(({ phase, from, to }) => (
            <li key={phase} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PHASE_VAR[phase] }} aria-hidden="true" />
                {PHASE_LABEL[phase]}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {from} →{' '}
                <span className="font-semibold text-foreground">{to === defaultKcal ? `${to} (default)` : to}</span> kcal
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhaseTargetField — one controlled per-phase calorie input (draft owned by the bar)
// ---------------------------------------------------------------------------

interface PhaseTargetFieldProps {
  phase: CyclePhase;
  value: string;
  defaultKcal: number;
  onChange: (val: string) => void;
  onReset: () => void;
}

function PhaseTargetField({ phase, value, defaultKcal, onChange, onReset }: PhaseTargetFieldProps) {
  const inputId = `phase-kcal-${phase}`;
  const n = Number(value);
  const isOverride = value.trim() !== '' && !isNaN(n) && n !== defaultKcal;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PHASE_VAR[phase] }} aria-hidden="true" />
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
          value={value}
          aria-label={`${PHASE_LABEL[phase]} calorie target`}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-xs tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-[11px] text-muted-foreground">kcal</span>
        {isOverride && (
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
      <span className={`pl-3.5 text-[10px] ${isOverride ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
        {isOverride ? 'Overridden' : 'Inherits default'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shopping list dialog body
// ---------------------------------------------------------------------------

interface ShoppingListBodyProps {
  groups: ShoppingGroup[];
  /** Heading level for category headings — h4 when nested under a per-week h3. */
  categoryAs?: 'h3' | 'h4';
  /** Empty-state copy (varies for a single week vs the whole block). */
  emptyLabel?: string;
}

function ShoppingListBody({ groups, categoryAs = 'h3', emptyLabel }: ShoppingListBodyProps) {
  const CategoryHeading = categoryAs;
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyLabel ?? 'No ingredients yet — fill some slots to see the shopping list.'}
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
            <CategoryHeading className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {CATEGORY_LABELS[group.category]}
            </CategoryHeading>
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
// ShoppingListView — the dialog body, with a By week / Two-week block toggle
// ---------------------------------------------------------------------------

interface ShoppingListViewProps {
  block: PlanBlock;
  recipes: Recipe[];
  foods: Food[];
}

function ShoppingListView({ block, recipes, foods }: ShoppingListViewProps) {
  const [mode, setMode] = useState<'block' | 'week'>('block');
  const rangeOf = (days: PlanDay[]) =>
    `${format(parseISO(days[0].date), 'MMM d')} – ${format(parseISO(days.at(-1)!.date), 'MMM d')}`;

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Shopping list view"
        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
      >
        {([['block', 'Two-week block'], ['week', 'By week']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'block' ? (
        <ShoppingListBody groups={shoppingListForDays(block.days, recipes, foods)} />
      ) : (
        <div className="space-y-6">
          {[0, 1].map((w) => {
            const weekDays = block.days.slice(w * 7, w * 7 + 7);
            if (weekDays.length === 0) return null;
            return (
              <section key={w} aria-label={`Week ${w + 1}, ${rangeOf(weekDays)}`} className="space-y-3">
                <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                  Week {w + 1}
                  <span className="text-[11px] font-normal text-muted-foreground">{rangeOf(weekDays)}</span>
                </h3>
                <ShoppingListBody
                  groups={shoppingListForDays(weekDays, recipes, foods)}
                  categoryAs="h4"
                  emptyLabel="No meals set this week."
                />
              </section>
            );
          })}
        </div>
      )}
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
  /** When false (viewing a past block) the card is a read-only, non-interactive tile. */
  editable: boolean;
  /** Extra classes on the card root (e.g. sm:col-span-2 for a lone last card). */
  className?: string;
}

function DayOverviewCell({ day, plan, recipes, foods, clientId, editable, className }: DayOverviewCellProps) {
  const navigate = useNavigate();
  const target = dayTargetFor(plan, day.phase);
  const totals = dayMacros(day, recipes, foods);
  const filledCount = day.slots.filter((s) => s.recipeId).length;
  const totalSlots = day.slots.length;
  const kcalPct = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;
  const over = totals.kcal > target.kcal;
  const macros = [
    { key: 'P', label: 'Protein', value: totals.protein, target: target.protein, bar: 'bg-macro-protein', dot: 'bg-macro-protein' },
    { key: 'C', label: 'Carbs', value: totals.carb, target: target.carb, bar: 'bg-macro-carb', dot: 'bg-macro-carb' },
    { key: 'F', label: 'Fat', value: totals.fat, target: target.fat, bar: 'bg-macro-fat', dot: 'bg-macro-fat' },
  ].map((m) => ({ ...m, pct: m.target > 0 ? Math.min(1, m.value / m.target) : 0 }));

  const summary = `${format(parseISO(day.date), 'EEEE, MMM d')}${day.phase ? ' — ' + PHASE_LABEL[day.phase] : ''}, ${filledCount} of ${totalSlots} meals set, ${totals.kcal} of ${target.kcal} kcal`;
  const baseClass = `flex w-full flex-col rounded-xl border border-border bg-card text-left ${className ?? ''}`;

  const content = (
    <>
      {/* Date + phase accent */}
      <div
        className="flex items-center justify-between gap-1 rounded-t-xl px-3 py-2"
        style={
          day.phase
            ? {
                borderBottom: `1px solid color-mix(in srgb, ${PHASE_VAR[day.phase]} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${PHASE_VAR[day.phase]} 10%, transparent)`,
              }
            : { borderBottom: '1px solid transparent' }
        }
      >
        <span className="text-sm font-semibold text-foreground">
          {format(parseISO(day.date), 'EEEE, MMM d')}
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

      {/* Calorie meter */}
      <div className="border-b border-border/60 px-3 pb-2.5 pt-2.5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className={`text-xs font-semibold tabular-nums ${over ? 'text-destructive' : 'text-foreground'}`}>
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
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-macro-kcal'}`}
            style={{ width: `${Math.round(kcalPct * 100)}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Per-day macros — protein / carb / fat vs target */}
      <div className="grid grid-cols-3 gap-3 border-b border-border/60 px-3 pb-2.5 pt-2.5">
        {macros.map((m) => (
          <div key={m.key} className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} aria-hidden="true" />
                {m.key}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{m.value}/{m.target}g</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={m.value}
              aria-valuemin={0}
              aria-valuemax={m.target}
              aria-label={`${m.label}: ${m.value} of ${m.target} g`}
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${Math.round(m.pct * 100)}%` }} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      {/* Meals — icon + name + kcal per slot (empty slots read as "not set") */}
      <ul className="m-0 flex flex-1 list-none flex-col gap-2 px-3 py-3" aria-hidden="true">
        {day.slots.map((slot) => {
          const recipe = slot.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined;
          const roleLabel = MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId;
          if (recipe) {
            const kcal = slotMacros(slot, recipes, foods).kcal;
            return (
              <li key={slot.id} className="flex items-center gap-2.5">
                <RecipeVisual recipe={recipe} className="h-8 w-8 shrink-0 rounded-lg" iconSize={16} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{recipe.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{kcal} kcal</span>
              </li>
            );
          }
          return (
            <li key={slot.id} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                <Plus size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{roleLabel} — not set</span>
            </li>
          );
        })}
      </ul>
    </>
  );

  if (!editable) {
    return (
      <div aria-label={summary} className={baseClass}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => navigate(`/coach/nutrition/client/${clientId}/plan/day/${day.date}`)}
      aria-label={`Edit ${summary}`}
      className={`${baseClass} transition-all hover:border-muted-foreground/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {content}
    </button>
  );
}

