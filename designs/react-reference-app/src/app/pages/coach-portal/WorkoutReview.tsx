import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Dumbbell,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import type { Exercise, ExerciseLog } from '../../context/TrainingContext';
import { RirBadge } from '../../components/workout/RirBadge';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume, formatLoad } from '../../utils/units';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { MetricTile } from '../../components/MetricTile';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cardVariants } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { LABEL_CLASS } from '../../components/typography';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe',
  c1: 'Jane Doe',
  c2: 'Jessica Alba',
  c3: 'Emma Stone',
  c4: 'Sarah Jenkins',
  c5: 'Mia Thermopolis',
};

const PIE_COLORS = [
  'var(--primary)',
  'var(--brand-secondary)',
  'var(--text-primary)',
  'var(--muted-foreground)',
  'var(--switch-background)',
];

// ── Epley formula for estimated rep maxes ──────────────────────
function estimateRM(weight: number, reps: number, targetReps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === targetReps) return weight;
  const oneRM = weight * (1 + reps / 30);
  if (targetReps === 1) return Math.round(oneRM * 10) / 10;
  // Reverse Epley: weight = 1RM / (1 + targetReps/30)
  return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
}

function getBestSet(
  exLog: ExerciseLog,
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number; estimated1RM: number } | null =
    null;
  for (const s of exLog.sets) {
    if (s.completed && s.actualWeight && s.actualReps) {
      const est = estimateRM(s.actualWeight, s.actualReps, 1);
      if (!best || est > best.estimated1RM) {
        best = {
          weight: s.actualWeight,
          reps: s.actualReps,
          estimated1RM: est,
        };
      }
    }
  }
  return best ? { weight: best.weight, reps: best.reps } : null;
}

function getFatigueIndex(exLog: ExerciseLog): number | null {
  const completedSets = exLog.sets.filter(
    (s) => s.completed && s.actualReps != null,
  );
  if (completedSets.length < 2) return null;
  const firstReps = completedSets[0].actualReps!;
  const lastReps = completedSets[completedSets.length - 1].actualReps!;
  if (firstReps === 0) return null;
  return Math.round(((firstReps - lastReps) / firstReps) * 100);
}

export function WorkoutReview() {
  const { id: clientId, logId } = useParams();
  const navigate = useNavigate();
  const { workoutLogs, exercises, planInstances } = useTraining();
  const { weightUnit } = useUnitPreferences();

  const workout = workoutLogs.find((w) => w.id === logId);
  const clientName = MOCK_CLIENTS[clientId || ''] || 'Unknown Client';

  if (!workout) {
    return (
      <EmptyState
        icon={Activity}
        title="Workout not found"
        description="This workout log doesn't exist."
        action={
          <Button
            onClick={() => navigate(`/coach/clients/${clientId}`)}
            variant="primary"
            size="md"
          >
            <ArrowLeft size={16} /> Back to Client
          </Button>
        }
      />
    );
  }

  const plan = planInstances.find((p) => p.id === workout.planInstanceId);
  const week = plan?.weeks[workout.weekIndex];
  const day = week?.days[workout.dayIndex];
  const durationMin = workout.duration ? Math.round(workout.duration / 60) : 0;
  const totalSets = workout.exercises.reduce((t, e) => t + e.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (t, e) => t + e.sets.filter((s) => s.completed).length,
    0,
  );
  const compliance =
    totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const workoutDate = new Date(workout.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Chart data ───────────────────────────────────────────────
  const volumeChartData = useMemo(
    () =>
      workout.exercises.map((exLog) => {
        const ex = exercises.find((e) => e.id === exLog.exerciseId);
        const vol = exLog.sets.reduce(
          (t, s) =>
            t +
            (s.completed && s.actualWeight && s.actualReps
              ? s.actualWeight * s.actualReps
              : 0),
          0,
        );
        return {
          name: ex?.name?.split(' ').slice(0, 2).join(' ') || '?',
          volume: vol,
        };
      }),
    [workout.exercises, exercises],
  );

  const muscleVolumeData = useMemo(() => {
    const muscleVol: Record<string, number> = {};
    workout.exercises.forEach((exLog) => {
      const ex = exercises.find((e) => e.id === exLog.exerciseId);
      const vol = exLog.sets.reduce(
        (t, s) =>
          t +
          (s.completed && s.actualWeight && s.actualReps
            ? s.actualWeight * s.actualReps
            : 0),
        0,
      );
      if (ex) {
        ex.primaryMuscles.forEach((m) => {
          muscleVol[m] = (muscleVol[m] || 0) + vol;
        });
      }
    });
    return Object.entries(muscleVol)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [workout.exercises, exercises]);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/coach/clients/${clientId}`)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to {clientName}
      </button>

      <PortalPageHeader
        title="Workout Review"
        subtitle={`${clientName} · ${workoutDate}`}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetricTile
          tone="neutral"
          icon={<Clock size={16} />}
          label="Duration"
          value={`${durationMin} min`}
        />
        <MetricTile
          tone="primary"
          icon={<Dumbbell size={16} />}
          label="Volume"
          value={formatVolume(workout.totalVolume || 0, weightUnit)}
        />
        <MetricTile
          tone="brand-secondary"
          icon={<TrendingUp size={16} />}
          label="Compliance"
          value={`${compliance}%`}
        />
        <MetricTile
          tone="neutral"
          icon={<Timer size={16} />}
          label="Day"
          value={day ? DAY_NAMES[day.dayOfWeek] : 'N/A'}
          hint={day ? `${day.type} · W${week?.order}` : undefined}
        />
      </div>

      {/* ── Analytics Section ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Volume per exercise — horizontal bar chart */}
        <div className={cn(cardVariants({ variant: 'card' }), 'p-5')}>
          <h3 className={cn(LABEL_CLASS, 'mb-4')}>Volume per Exercise</h3>
          <div className="space-y-3">
            {(() => {
              const maxVol = Math.max(
                ...volumeChartData.map((d) => d.volume),
                1,
              );
              return volumeChartData.map((d) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary truncate mr-2">
                      {d.name}
                    </span>
                    <span className="text-xs text-text-secondary shrink-0">
                      {formatVolume(d.volume, weightUnit)}
                    </span>
                  </div>
                  <div className="h-5 bg-surface-quiet rounded-field overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-field transition-all"
                      style={{ width: `${(d.volume / maxVol) * 100}%` }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Muscle group volume split — legend-only (no pie dependency) */}
        <div className={cn(cardVariants({ variant: 'card' }), 'p-5')}>
          <h3 className={cn(LABEL_CLASS, 'mb-4')}>Muscle Group Volume</h3>
          {(() => {
            const totalMuscleVol =
              muscleVolumeData.reduce((t, d) => t + d.value, 0) || 1;
            return (
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="h-6 rounded-full overflow-hidden flex">
                  {muscleVolumeData.map((d, i) => (
                    <div
                      key={d.name}
                      className="h-full transition-all"
                      style={{
                        width: `${(d.value / totalMuscleVol) * 100}%`,
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2 mt-2">
                  {muscleVolumeData.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-xs text-text-primary font-medium">
                          {d.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">
                          {formatVolume(d.value, weightUnit)}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {Math.round((d.value / totalMuscleVol) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Estimated Rep Maxes & Fatigue ────────────────────────── */}
      <div className={cn(cardVariants({ variant: 'card' }), 'p-5 mb-8')}>
        <h3 className={cn(LABEL_CLASS, 'mb-4')}>
          Estimated Rep Maxes & Fatigue
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          Estimated from the heaviest set using the Epley formula
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={cn(LABEL_CLASS, 'border-b border-border-subtle')}>
                <th className="pb-3 pr-4">Exercise</th>
                <th className="pb-3 pr-3 text-center">Best Set</th>
                <th className="pb-3 pr-3 text-center">Est. 1RM</th>
                <th className="pb-3 pr-3 text-center">Est. 2RM</th>
                <th className="pb-3 pr-3 text-center">Est. 3RM</th>
                <th className="pb-3 text-center">Fatigue</th>
              </tr>
            </thead>
            <tbody>
              {workout.exercises.map((exLog) => {
                const ex = exercises.find((e) => e.id === exLog.exerciseId);
                if (!ex) return null;
                const best = getBestSet(exLog);
                const fatigue = getFatigueIndex(exLog);
                if (!best) return null;

                const e1RM = estimateRM(best.weight, best.reps, 1);
                const e2RM = estimateRM(best.weight, best.reps, 2);
                const e3RM = estimateRM(best.weight, best.reps, 3);

                return (
                  <tr
                    key={exLog.planExerciseId}
                    className="px-3 border-b border-border-subtle last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-text-primary">
                        {ex.name}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-medium text-text-primary">
                        {formatLoad(best.weight, weightUnit)}
                      </span>
                      <span className="text-xs text-text-secondary ml-1">
                        x{best.reps}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-medium text-primary">
                        {formatLoad(e1RM, weightUnit)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-medium text-text-primary">
                        {formatLoad(e2RM, weightUnit)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className="text-sm font-medium text-text-primary">
                        {formatLoad(e3RM, weightUnit)}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {fatigue !== null ? (
                        <span
                          className={`text-sm font-medium ${
                            fatigue > 25
                              ? 'text-primary'
                              : fatigue > 10
                                ? 'text-text-secondary'
                                : 'text-brand-secondary'
                          }`}
                        >
                          {fatigue > 0 ? `-${fatigue}%` : `${fatigue}%`}
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Fatigue = % rep drop from first to last set. Under 10% = well managed.
          Over 25% = may need longer rest or lighter load.
        </p>
      </div>

      {/* ── Exercise detail cards (existing) ─────────────────────── */}
      <h2 className={cn(LABEL_CLASS, 'mb-4')}>Set-by-Set Breakdown</h2>
      <div className="space-y-5">
        {workout.exercises.map((exLog, i) => {
          const ex = exercises.find((e) => e.id === exLog.exerciseId);
          const originalEx = exLog.wasSwapped
            ? exercises.find((e) => e.id === exLog.originalExerciseId)
            : null;
          const planEx = day?.exercises[i];
          const avgRest =
            exLog.restTimeTaken.length > 0
              ? Math.round(
                  exLog.restTimeTaken.reduce((a, b) => a + b, 0) /
                    exLog.restTimeTaken.length,
                )
              : null;
          const prescribedRest = planEx?.restSeconds;

          if (!ex) return null;

          return (
            <div
              key={exLog.planExerciseId}
              className={cn(
                cardVariants({ variant: 'card' }),
                'overflow-hidden',
              )}
            >
              {/* Exercise header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary text-base">
                      {ex.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ex.equipment.map((eq) => (
                        <Badge key={eq} tone="muted">
                          {eq}
                        </Badge>
                      ))}
                      {ex.primaryMuscles.map((m) => (
                        <Badge key={m} tone="brand-secondary">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={LABEL_CLASS}>Prescribed</span>
                    <p className="text-xs text-text-secondary mt-0.5 inline-flex items-center gap-1.5 justify-end">
                      <span>
                        {planEx?.sets}x{planEx?.reps}
                      </span>
                      <span className="text-text-secondary">&middot;</span>
                      <span>RIR</span>
                      {planEx?.rir != null && <RirBadge value={planEx.rir} />}
                    </p>
                    {prescribedRest && (
                      <p className="text-xs text-text-secondary">
                        {prescribedRest}s rest
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Swap callout */}
              {exLog.wasSwapped && originalEx && (
                <SwapCallout original={originalEx} swappedTo={ex} />
              )}

              {/* Set-by-set comparison */}
              <div className="border-t border-border-subtle">
                <div
                  className={cn(
                    LABEL_CLASS,
                    'grid grid-cols-[2.5rem_1fr_1fr_4rem] gap-2 px-5 py-2.5 bg-surface-quiet',
                  )}
                >
                  <span>Set</span>
                  <span>Prescribed</span>
                  <span>Logged</span>
                  <span className="text-right">Rest</span>
                </div>

                {exLog.sets.map((s, si) => {
                  const prescribedRepsStr = s.isExtra
                    ? '—'
                    : planEx?.reps || '--';
                  const prescribedNum = parseInt(planEx?.reps || '0');
                  const repsDiff =
                    !s.isExtra && s.actualReps != null && !isNaN(prescribedNum)
                      ? s.actualReps - prescribedNum
                      : null;
                  const isRepsUnder = repsDiff !== null && repsDiff < 0;
                  const isRepsOver = repsDiff !== null && repsDiff > 0;
                  const isRepsMatch = repsDiff !== null && repsDiff === 0;
                  const restTaken = exLog.restTimeTaken[si];
                  const isRestOver =
                    restTaken != null &&
                    prescribedRest != null &&
                    restTaken > prescribedRest + 15;

                  return (
                    <div
                      key={s.setNumber}
                      className={`grid grid-cols-[2.5rem_1fr_1fr_4rem] gap-2 px-5 py-3 items-center border-t border-border-subtle ${
                        isRepsUnder
                          ? 'bg-primary-soft'
                          : isRepsOver
                            ? 'bg-brand-secondary-soft'
                            : ''
                      }`}
                    >
                      <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
                        {s.setNumber}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.isExtra ? (
                          <Badge
                            tone="outline"
                            className="border-primary/20 bg-primary-soft text-primary"
                          >
                            Extra
                          </Badge>
                        ) : (
                          <>
                            <span className="text-sm text-text-secondary">
                              {prescribedRepsStr} reps
                            </span>
                            {planEx?.rir != null && (
                              <RirBadge value={planEx.rir} />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.completed ? (
                          <>
                            <span className="text-sm font-medium text-text-primary">
                              {s.actualWeight != null
                                ? formatLoad(s.actualWeight, weightUnit)
                                : '—'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              &times;
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                isRepsUnder
                                  ? 'text-primary'
                                  : isRepsOver
                                    ? 'text-brand-secondary'
                                    : 'text-text-primary'
                              }`}
                            >
                              {s.actualReps}
                            </span>
                            {repsDiff !== null && !isRepsMatch && (
                              <Badge
                                tone="outline"
                                className={
                                  isRepsUnder
                                    ? 'border-primary/20 bg-primary-soft text-primary'
                                    : 'border-brand-secondary/20 bg-brand-secondary-soft text-brand-secondary'
                                }
                              >
                                {repsDiff > 0 ? `+${repsDiff}` : repsDiff}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-text-secondary italic">
                            Skipped
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs text-right ${isRestOver ? 'text-primary font-medium' : 'text-text-secondary'}`}
                      >
                        {restTaken != null ? `${restTaken}s` : '--'}
                      </span>
                    </div>
                  );
                })}

                {avgRest !== null && prescribedRest && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-border-subtle bg-surface-quiet">
                    <span className={LABEL_CLASS}>Avg rest</span>
                    <span
                      className={`text-xs font-medium ${avgRest > prescribedRest + 15 ? 'text-primary' : 'text-text-primary'}`}
                    >
                      {avgRest}s
                      <span className="text-text-secondary font-normal">
                        {' '}
                        / {prescribedRest}s prescribed
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Swap callout component ─────────────────────────────────────

function SwapCallout({
  original,
  swappedTo,
}: {
  original: Exercise;
  swappedTo: Exercise;
}) {
  return (
    <div className="mx-5 mb-4 rounded-control border border-brand-secondary/20 bg-brand-secondary-soft p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ArrowLeftRight size={13} className="text-brand-secondary" />
        <span className={cn(LABEL_CLASS, 'text-brand-secondary')}>
          Exercise Swapped
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(LABEL_CLASS, 'mb-1')}>Originally</p>
          <p className="text-sm font-medium text-text-secondary line-through decoration-text-secondary">
            {original.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {original.primaryMuscles.map((m) => (
              <Badge key={m} tone="muted">
                {m}
              </Badge>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <ArrowRight size={16} className="text-brand-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(LABEL_CLASS, 'mb-1 text-brand-secondary')}>
            Performed
          </p>
          <p className="text-sm font-medium text-text-primary">
            {swappedTo.name}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {swappedTo.primaryMuscles.map((m) => (
              <Badge key={m} tone="brand-secondary">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
