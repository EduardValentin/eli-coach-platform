import { useState, useMemo } from 'react';
import { useTraining } from '../../context/TrainingContext';
import { CalendarDays, Play, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { WeekSwitcher } from '../../components/workout/WeekSwitcher';
import { PlanExerciseRow } from '../../components/workout/PlanExerciseRow';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DayType = 'Strength' | 'Hypertrophy' | 'Conditioning' | 'Rest' | string;

const DAY_TYPE_ACCENT: Record<string, string> = {
  Strength: 'text-training-strength',
  Hypertrophy: 'text-training-hypertrophy',
  Conditioning: 'text-blue-600',
};

export function ClientPlan() {
  const { clientActivePlan, exercises, goals } = useTraining();
  const navigate = useNavigate();

  const initialWeekIdx = clientActivePlan
    ? Math.max(0, (clientActivePlan.currentWeekNumber || 1) - 1)
    : 0;
  const [activeWeekIdx, setActiveWeekIdx] = useState(initialWeekIdx);

  const activeGoal = useMemo(() => {
    if (!clientActivePlan) return null;
    return goals.find(g => g.id === clientActivePlan.goalId) || null;
  }, [clientActivePlan, goals]);

  if (!clientActivePlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <CalendarDays size={32} className="text-neutral-600" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-text-primary mb-2">No Active Plan</h1>
        <p className="text-neutral-600 max-w-md">You don't have an active training plan assigned right now. Your coach will assign one soon.</p>
      </div>
    );
  }

  const activeWeek = clientActivePlan.weeks[activeWeekIdx];
  if (!activeWeek) return null;

  const currentWeekIdx = (clientActivePlan.currentWeekNumber || 1) - 1;

  const metaParts = [
    `Week ${clientActivePlan.currentWeekNumber}`,
    activeGoal?.name,
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-7">
      <header className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-text-primary leading-tight">
          {clientActivePlan.name}
        </h1>
        <p className="text-sm text-neutral-600">{metaParts.join(' · ')}</p>
        <WeekSwitcher
          weeks={clientActivePlan.weeks}
          activeWeekIdx={activeWeekIdx}
          currentWeekIdx={currentWeekIdx}
          maxWeekIdx={currentWeekIdx}
          onChange={setActiveWeekIdx}
        />
        <p className="flex items-start gap-1.5 text-xs text-neutral-600 leading-relaxed">
          <Info size={13} className="text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span><span className="font-semibold text-text-primary">RIR</span> = reps in reserve — how many more reps you could do at the end of a set before reaching failure.</span>
        </p>
      </header>

      <div className="space-y-4">
        {activeWeek.days.map((day, dIdx) => {
          if (day.type === 'Rest') {
            return <RestDayDivider key={day.id} dayName={DAY_NAMES[dIdx]} />;
          }

          const groupedExercises: { isSuperset: boolean; id: string; items: typeof day.exercises }[] = [];
          const processedIds = new Set<string>();

          day.exercises.forEach(pe => {
            if (processedIds.has(pe.id)) return;
            if (pe.supersetId) {
              const ssItems = day.exercises.filter(e => e.supersetId === pe.supersetId);
              groupedExercises.push({ isSuperset: true, id: pe.supersetId, items: ssItems });
              ssItems.forEach(i => processedIds.add(i.id));
            } else {
              groupedExercises.push({ isSuperset: false, id: pe.id, items: [pe] });
              processedIds.add(pe.id);
            }
          });

          return (
            <motion.section
              key={day.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dIdx * 0.04 }}
              aria-label={`${DAY_NAMES[dIdx]} — ${day.type}`}
              className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${DAY_TYPE_ACCENT[day.type as DayType] ?? 'text-neutral-600'}`}>
                    {day.type}
                  </p>
                  <h2 className="font-semibold text-base sm:text-lg text-text-primary leading-tight mt-0.5">
                    {DAY_NAMES[dIdx]}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/portal/workout/${clientActivePlan.id}/${activeWeekIdx}/${dIdx}`)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover hover:bg-brand/5 px-3 min-h-10 rounded-xl transition-colors"
                >
                  Start
                  <Play size={14} fill="currentColor" aria-hidden="true" />
                </button>
              </div>

              {groupedExercises.length > 0 && (
                <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2">
                  {groupedExercises.map(group =>
                    group.isSuperset ? (
                      <SupersetGroup key={group.id}>
                        {group.items.map(pe => {
                          const ex = exercises.find(e => e.id === pe.exerciseId);
                          if (!ex) return null;
                          return (
                            <PlanExerciseRow
                              key={pe.id}
                              planExercise={{ id: pe.id, sets: pe.sets, reps: pe.reps, rir: pe.rir }}
                              exercise={ex}
                            />
                          );
                        })}
                      </SupersetGroup>
                    ) : (
                      group.items.map(pe => {
                        const ex = exercises.find(e => e.id === pe.exerciseId);
                        if (!ex) return null;
                        return (
                          <PlanExerciseRow
                            key={pe.id}
                            planExercise={{ id: pe.id, sets: pe.sets, reps: pe.reps, rir: pe.rir }}
                            exercise={ex}
                          />
                        );
                      })
                    )
                  )}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

function RestDayDivider({ dayName }: { dayName: string }) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator" aria-label={`${dayName} rest day`}>
      <span className="flex-1 h-px bg-neutral-200" aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">
        {dayName} · Rest
      </span>
      <span className="flex-1 h-px bg-neutral-200" aria-hidden="true" />
    </div>
  );
}

function SupersetGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-3">
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-secondary/60"
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-secondary mb-1.5">Superset</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
