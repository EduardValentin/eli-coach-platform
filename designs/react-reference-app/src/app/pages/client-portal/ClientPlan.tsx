import { useState, useMemo } from 'react';
import { useTraining } from '../../context/TrainingContext';
import { CalendarDays, Play, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { WeekSwitcher } from '../../components/workout/WeekSwitcher';
import { PlanExerciseRow } from '../../components/workout/PlanExerciseRow';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/EmptyState';
import { LABEL_CLASS } from '../../components/typography';
import { cn } from '../../components/ui/utils';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type DayType = 'Strength' | 'Hypertrophy' | 'Conditioning' | 'Rest' | string;

const DAY_TYPE_ACCENT: Record<string, string> = {
  Strength: 'text-training-strength',
  Hypertrophy: 'text-training-hypertrophy',
  Conditioning: 'text-training-lighter',
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
    return goals.find((g) => g.id === clientActivePlan.goalId) || null;
  }, [clientActivePlan, goals]);

  if (!clientActivePlan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <EmptyState
          icon={CalendarDays}
          title="No active plan"
          description="You don't have an active training plan assigned right now. Your coach will assign one soon."
        />
      </div>
    );
  }

  const activeWeek = clientActivePlan.weeks[activeWeekIdx];
  if (!activeWeek) return null;

  const currentWeekIdx = (clientActivePlan.currentWeekNumber || 1) - 1;

  const metaParts = [
    `Week ${clientActivePlan.currentWeekNumber}`,
    activeGoal?.type,
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-7">
      <div>
        <PortalPageHeader
          title={clientActivePlan.name}
          subtitle={metaParts.join(' · ')}
        />
        <div className="space-y-3">
          <WeekSwitcher
            weeks={clientActivePlan.weeks}
            activeWeekIdx={activeWeekIdx}
            currentWeekIdx={currentWeekIdx}
            maxWeekIdx={currentWeekIdx}
            onChange={setActiveWeekIdx}
          />
          <p className="flex items-start gap-1.5 text-xs text-text-secondary leading-relaxed">
            <Info
              size={13}
              className="text-text-secondary shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium text-text-primary">RIR</span> = reps
              in reserve — how many more reps you could do at the end of a set
              before reaching failure.
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activeWeek.days.map((day, dIdx) => {
          if (day.type === 'Rest') {
            return <RestDayDivider key={day.id} dayName={DAY_NAMES[dIdx]} />;
          }

          const groupedExercises: {
            isSuperset: boolean;
            id: string;
            items: typeof day.exercises;
          }[] = [];
          const processedIds = new Set<string>();

          day.exercises.forEach((pe) => {
            if (processedIds.has(pe.id)) return;
            if (pe.supersetId) {
              const ssItems = day.exercises.filter(
                (e) => e.supersetId === pe.supersetId,
              );
              groupedExercises.push({
                isSuperset: true,
                id: pe.supersetId,
                items: ssItems,
              });
              ssItems.forEach((i) => processedIds.add(i.id));
            } else {
              groupedExercises.push({
                isSuperset: false,
                id: pe.id,
                items: [pe],
              });
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
              className="bg-card rounded-card border border-border overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border-subtle rounded-field flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      LABEL_CLASS,
                      DAY_TYPE_ACCENT[day.type as DayType],
                    )}
                  >
                    {day.type}
                  </p>
                  <h2 className="font-semibold text-base sm:text-lg text-text-primary leading-tight mt-0.5">
                    {DAY_NAMES[dIdx]}
                  </h2>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/portal/workout/${clientActivePlan.id}/${activeWeekIdx}/${dIdx}`,
                    )
                  }
                  variant="ghost"
                  className="shrink-0 text-primary hover:text-primary-hover hover:bg-primary-soft"
                >
                  Start
                  <Play size={14} fill="currentColor" aria-hidden="true" />
                </Button>
              </div>

              {groupedExercises.length > 0 && (
                <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2">
                  {groupedExercises.map((group) =>
                    group.isSuperset ? (
                      <SupersetGroup key={group.id}>
                        {group.items.map((pe) => {
                          const ex = exercises.find(
                            (e) => e.id === pe.exerciseId,
                          );
                          if (!ex) return null;
                          return (
                            <PlanExerciseRow
                              key={pe.id}
                              planExercise={{
                                id: pe.id,
                                sets: pe.sets,
                                reps: pe.reps,
                                rir: pe.rir,
                              }}
                              exercise={ex}
                            />
                          );
                        })}
                      </SupersetGroup>
                    ) : (
                      group.items.map((pe) => {
                        const ex = exercises.find(
                          (e) => e.id === pe.exerciseId,
                        );
                        if (!ex) return null;
                        return (
                          <PlanExerciseRow
                            key={pe.id}
                            planExercise={{
                              id: pe.id,
                              sets: pe.sets,
                              reps: pe.reps,
                              rir: pe.rir,
                            }}
                            exercise={ex}
                          />
                        );
                      })
                    ),
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
    <div
      className="flex items-center gap-3 py-1"
      role="separator"
      aria-label={`${dayName} rest day`}
    >
      <span className="flex-1 h-px bg-border-subtle" aria-hidden="true" />
      <span className={LABEL_CLASS}>{dayName} · Rest</span>
      <span className="flex-1 h-px bg-border-subtle" aria-hidden="true" />
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
      <p className={cn(LABEL_CLASS, 'text-brand-secondary mb-1.5')}>Superset</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
