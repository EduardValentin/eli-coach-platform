import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useNutrition, dayMacros, dayTargetFor, seedDailyTarget,
} from '../../context/NutritionContext';
import type { PlanDay, ClientNutritionPlan, Recipe, Food } from '../../context/NutritionContext';
import { useCycle } from '../../context/CycleContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { Button } from '../../components/ui/button';
import { PHASE_LABEL, PHASE_VAR, MEAL_ROLE_LABEL } from '../../components/coach/nutrition/plan-constants';

export function NutritionPlanBuilderPage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getPlan, createBlock, recipes, foods } = useNutrition();
  const { getPhaseForDate } = useCycle();
  const { getProfile } = useClientProfile();

  const profile = getProfile(clientId);
  const plan = getPlan(clientId);
  const block = plan?.blocks.find((b) => b.status === 'active');

  const handleCreate = () => {
    const target = profile ? seedDailyTarget(profile) : { kcal: 2000, protein: 150, carb: 200, fat: 65 };
    const isoLocal = (d: Date) => {
      const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const phases = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      return getPhaseForDate(clientId, isoLocal(d)) ?? undefined;
    });
    createBlock(clientId, target, phases);
  };

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

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {!block ? (
          <div className="mx-auto mt-20 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-serif text-xl text-foreground">No active plan</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Build a 2-week, cycle-aware block. Days are auto-stamped from {profile?.name ?? 'the client'}'s cycle.
            </p>
            <Button className="mt-5" onClick={handleCreate}>Create 2-week block</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {[0, 1].map((week) => (
              <section key={week} aria-label={`Week ${week + 1}`}>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Week {week + 1}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                  {block.days.slice(week * 7, week * 7 + 7).map((day) => (
                    <DayColumn key={day.date} day={day} plan={plan!} recipes={recipes} foods={foods} />
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

function DayColumn({ day, plan, recipes, foods }: { day: PlanDay; plan: ClientNutritionPlan; recipes: Recipe[]; foods: Food[] }) {
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
          <div key={slot.id} className="rounded-lg bg-muted px-2 py-1.5">
            <p className="text-[11px] font-medium text-foreground">{MEAL_ROLE_LABEL[slot.mealRoleId] ?? slot.mealRoleId}</p>
            <p className="text-[11px] text-muted-foreground">{slot.recipeId ? '' : `~${slot.suggestedKcal} kcal`}</p>
          </div>
        ))}
      </div>
      <p className={`border-t border-border px-3 py-1.5 text-[11px] font-medium ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
        {totals.kcal} / {target.kcal} kcal
      </p>
    </div>
  );
}
