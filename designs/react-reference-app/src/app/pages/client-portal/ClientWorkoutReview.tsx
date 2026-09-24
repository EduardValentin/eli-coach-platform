import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Dumbbell,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { useTraining } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import {
  formatVolume,
  formatLoad,
  displayWeightValue,
  weightUnitLabel,
} from '../../utils/units';
import type { Exercise, ExerciseLog } from '../../context/TrainingContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MetricTile } from '../../components/MetricTile';
import { EmptyState } from '../../components/EmptyState';
import {
  LABEL_CLASS,
  VALUE_CLASS,
  WIDGET_TITLE_CLASS,
} from '../../components/typography';
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
const PIE_COLORS = [
  'var(--primary)',
  'var(--brand-secondary)',
  'var(--text-primary)',
  'var(--muted-foreground)',
  'var(--switch-background)',
];

function estimateRM(weight: number, reps: number, targetReps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === targetReps) return weight;
  const oneRM = weight * (1 + reps / 30);
  if (targetReps === 1) return Math.round(oneRM * 10) / 10;
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

export function ClientWorkoutReview() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const { workoutLogs, exercises, planInstances } = useTraining();
  const { weightUnit } = useUnitPreferences();

  const workout = workoutLogs.find((w) => w.id === logId);

  if (!workout) {
    return (
      <div className="py-20">
        <EmptyState
          icon={Dumbbell}
          title="Session not found"
          description="This workout session couldn't be found."
          action={
            <Button
              onClick={() => navigate('/portal/history')}
              variant="primary"
              size="md"
            >
              <ArrowLeft size={16} /> Back to History
            </Button>
          }
        />
      </div>
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
  const density =
    durationMin > 0 ? Math.round((workout.totalVolume || 0) / durationMin) : 0;
  const workoutDate = new Date(workout.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

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
      if (ex)
        ex.primaryMuscles.forEach((m) => {
          muscleVol[m] = (muscleVol[m] || 0) + vol;
        });
    });
    return Object.entries(muscleVol)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [workout.exercises, exercises]);

  return (
    <div>
      <Button
        type="button"
        onClick={() => navigate('/portal/history')}
        variant="ghost"
        size="sm"
        className="mb-6"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to history
      </Button>

      <PortalPageHeader
        title="Session Review"
        subtitle={`${workoutDate}${day ? ` \u00B7 ${day.type}` : ''}${week ? ` \u00B7 Week ${week.order}` : ''}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
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
          label="Completed"
          value={`${completedSets}/${totalSets}`}
        />
        <MetricTile
          tone="primary"
          icon={<Zap size={16} />}
          label="Density"
          value={displayWeightValue(density, weightUnit)}
          hint={`${weightUnitLabel(weightUnit)}/min`}
        />
        <MetricTile
          tone="neutral"
          icon={<Timer size={16} />}
          label="Day"
          value={day ? DAY_NAMES[day.dayOfWeek] : 'N/A'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Volume per exercise */}
        <div className="bg-card rounded-card border border-border p-5">
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

        {/* Muscle group split */}
        <div className="bg-card rounded-card border border-border p-5">
          <h3 className={cn(LABEL_CLASS, 'mb-4')}>Muscle Groups</h3>
          {(() => {
            const total =
              muscleVolumeData.reduce((t, d) => t + d.value, 0) || 1;
            return (
              <div className="space-y-3">
                <div className="h-6 rounded-full overflow-hidden flex">
                  {muscleVolumeData.map((d, i) => (
                    <div
                      key={d.name}
                      className="h-full"
                      style={{
                        width: `${(d.value / total) * 100}%`,
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                  ))}
                </div>
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
                          {Math.round((d.value / total) * 100)}%
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

      {/* Estimated Rep Maxes */}
      <div className="bg-card rounded-card border border-border p-4 sm:p-5 mb-8">
        <h3 className={cn(LABEL_CLASS, 'mb-2')}>Your Estimated Maxes</h3>
        <p className="text-xs text-text-secondary mb-4">
          Based on your heaviest set this session (Epley formula)
        </p>

        <ul className="md:hidden space-y-3">
          {workout.exercises.map((exLog) => {
            const ex = exercises.find((e) => e.id === exLog.exerciseId);
            if (!ex) return null;
            const best = getBestSet(exLog);
            const fatigue = getFatigueIndex(exLog);
            if (!best) return null;
            const e1RM = estimateRM(best.weight, best.reps, 1);
            const e3RM = estimateRM(best.weight, best.reps, 3);
            const fatigueColor =
              fatigue === null
                ? 'text-text-secondary'
                : fatigue > 25
                  ? 'text-primary'
                  : fatigue > 10
                    ? 'text-text-secondary'
                    : 'text-brand-secondary';
            return (
              <li
                key={exLog.planExerciseId}
                className="rounded-control bg-surface-quiet border border-border-subtle p-3"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {ex.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Best set: {formatLoad(best.weight, weightUnit)} &times;{' '}
                      {best.reps}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MaxStat
                    label="Est. 1RM"
                    value={formatLoad(e1RM, weightUnit)}
                    accent
                  />
                  <MaxStat
                    label="Est. 3RM"
                    value={formatLoad(e3RM, weightUnit)}
                  />
                  <MaxStat
                    label="Fatigue"
                    value={
                      fatigue !== null
                        ? fatigue > 0
                          ? `-${fatigue}%`
                          : `${fatigue}%`
                        : '--'
                    }
                    valueClassName={fatigueColor}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="px-3 border-b border-border-subtle rounded-field">
                <th className={cn(LABEL_CLASS, 'pb-3 pr-4')}>Exercise</th>
                <th className={cn(LABEL_CLASS, 'pb-3 pr-3 text-center')}>
                  Best Set
                </th>
                <th className={cn(LABEL_CLASS, 'pb-3 pr-3 text-center')}>
                  Est. 1RM
                </th>
                <th className={cn(LABEL_CLASS, 'pb-3 pr-3 text-center')}>
                  Est. 3RM
                </th>
                <th className={cn(LABEL_CLASS, 'pb-3 text-center')}>Fatigue</th>
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
                const e3RM = estimateRM(best.weight, best.reps, 3);
                return (
                  <tr
                    key={exLog.planExerciseId}
                    className="px-3 border-b border-border-subtle rounded-field last:border-0"
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
                        {formatLoad(e3RM, weightUnit)}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {fatigue !== null ? (
                        <span
                          className={`text-sm font-medium ${fatigue > 25 ? 'text-primary' : fatigue > 10 ? 'text-text-secondary' : 'text-brand-secondary'}`}
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
      </div>

      {/* Exercise breakdown */}
      <h2 className={cn(LABEL_CLASS, 'mb-4')}>Your Sets</h2>
      <div className="space-y-4">
        {workout.exercises.map((exLog, i) => {
          const ex = exercises.find((e) => e.id === exLog.exerciseId);
          const planEx = day?.exercises[i];
          if (!ex) return null;
          return (
            <div
              key={exLog.planExerciseId}
              className="bg-card rounded-card border border-border overflow-hidden"
            >
              <div className="p-5 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className={WIDGET_TITLE_CLASS}>{ex.name}</h3>
                  {exLog.wasSwapped && (
                    <Badge variant="brand-secondary">
                      <ArrowLeftRight aria-hidden="true" /> Swapped
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ex.primaryMuscles.map((m) => (
                    <Badge key={m} variant="brand-secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="border-t border-border-subtle">
                {exLog.sets
                  .filter((s) => s.completed)
                  .map((s) => {
                    const prescribedNum = parseInt(planEx?.reps || '0');
                    const repsDiff =
                      !s.isExtra &&
                      s.actualReps != null &&
                      !isNaN(prescribedNum)
                        ? s.actualReps - prescribedNum
                        : null;
                    const isUnder = repsDiff !== null && repsDiff < 0;
                    const isOver = repsDiff !== null && repsDiff > 0;
                    return (
                      <div
                        key={s.setNumber}
                        className={`flex items-center px-5 py-2.5 text-sm border-t border-border-subtle first:border-t-0 ${isUnder ? 'bg-primary-soft' : isOver ? 'bg-brand-secondary-soft' : ''}`}
                      >
                        <span className="w-8 text-xs font-medium text-text-secondary">
                          {s.setNumber}
                        </span>
                        <span className="font-medium text-text-primary">
                          {s.actualWeight != null
                            ? formatLoad(s.actualWeight, weightUnit)
                            : '—'}
                        </span>
                        <span className="text-text-secondary mx-1.5">
                          &times;
                        </span>
                        <span
                          className={`font-medium ${isUnder ? 'text-primary' : isOver ? 'text-brand-secondary' : 'text-text-primary'}`}
                        >
                          {s.actualReps}
                        </span>
                        {repsDiff !== null && repsDiff !== 0 && (
                          <Badge
                            className={cn(
                              'ml-2 border-transparent',
                              isUnder
                                ? 'bg-primary-soft text-primary'
                                : 'bg-brand-secondary-soft text-brand-secondary',
                            )}
                          >
                            {repsDiff > 0 ? `+${repsDiff}` : repsDiff}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Back */}
      <div className="mt-8">
        <Button
          onClick={() => navigate('/portal/history')}
          variant="primary"
          size="md"
          className="w-full"
        >
          Back to History <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function MaxStat({
  label,
  value,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  accent?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-compact bg-card border border-border px-2 py-2 text-center">
      <p className={cn(LABEL_CLASS, 'mb-1')}>{label}</p>
      <p
        className={cn(
          VALUE_CLASS,
          valueClassName ?? (accent ? 'text-primary' : ''),
        )}
      >
        {value}
      </p>
    </div>
  );
}
