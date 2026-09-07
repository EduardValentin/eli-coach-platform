import { useState } from 'react';
import { Calendar, Dumbbell, Clock, TrendingUp, Activity } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume } from '../../utils/units';
import { MetricTile } from '../../components/MetricTile';
import { WorkoutSessionCard } from '../../components/workout/WorkoutSessionCard';
import { ResponsiveSheetDialog } from '../../components/workout/ResponsiveSheetDialog';

type MuscleCount = { muscle: string; count: number };

export function ClientWorkoutHistory() {
  const { getClientWorkoutHistory, exercises } = useTraining();
  const { weightUnit } = useUnitPreferences();
  const history = getClientWorkoutHistory('client-1');
  const [muscleSheetOpen, setMuscleSheetOpen] = useState(false);

  const totalSessions = history.length;
  const totalVolume = history.reduce((t, w) => t + (w.totalVolume || 0), 0);
  const totalDuration = history.reduce((t, w) => t + (w.duration || 0), 0);
  const avgVolume = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0;
  const avgDuration = totalSessions > 0 ? Math.round(totalDuration / 60 / totalSessions) : 0;

  const muscleFrequency: Record<string, number> = {};
  history.forEach(w => {
    w.exercises.forEach(el => {
      exercises.find(e => e.id === el.exerciseId)?.primaryMuscles.forEach(m => {
        muscleFrequency[m] = (muscleFrequency[m] || 0) + 1;
      });
    });
  });
  const sortedMuscles: MuscleCount[] = Object.entries(muscleFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([muscle, count]) => ({ muscle, count }));
  const topMuscles = sortedMuscles.slice(0, 3);
  const hasMore = sortedMuscles.length > topMuscles.length;
  const maxMuscleCount = sortedMuscles[0]?.count ?? 0;

  const sortedHistory = [...history].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-foreground">Workout History</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your past training sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetricTile tone="neutral" icon={<Calendar size={16} />} label="Sessions" value={totalSessions} />
        <MetricTile tone="brand" icon={<Dumbbell size={16} />} label="Total Volume" value={formatVolume(totalVolume, weightUnit)} />
        <MetricTile tone="brand-secondary" icon={<TrendingUp size={16} />} label="Avg Volume" suffix="/ session" value={formatVolume(avgVolume, weightUnit)} />
        <MetricTile tone="neutral" icon={<Clock size={16} />} label="Avg Duration" suffix="/ session" value={`${avgDuration} min`} />
      </div>

      {/* Most trained muscles */}
      {topMuscles.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Most Trained</h2>
            {hasMore && (
              <button
                type="button"
                onClick={() => setMuscleSheetOpen(true)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                View all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {topMuscles.map(({ muscle, count }) => (
              <span key={muscle} className="text-xs bg-brand-secondary-soft text-brand-secondary rounded-full px-3 py-1.5 font-medium">
                {muscle} <span className="font-normal ml-1">{count}x</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ResponsiveSheetDialog
        open={muscleSheetOpen}
        onOpenChange={setMuscleSheetOpen}
        title="Most trained muscles"
        description="Frequency of each muscle group across your completed sessions."
      >
        <div className="px-5 pt-6 pb-4 md:px-8 md:pt-8 border-b border-border rounded-md">
          <h3 className="text-lg md:text-xl font-semibold text-foreground pr-10">Most trained muscles</h3>
          <p className="text-sm text-muted-foreground mt-1">Times trained across {totalSessions} completed {totalSessions === 1 ? 'session' : 'sessions'}.</p>
        </div>
        <ul className="px-5 py-4 md:px-8 md:py-6 overflow-y-auto space-y-3">
          {sortedMuscles.map(({ muscle, count }, idx) => {
            const pct = maxMuscleCount > 0 ? (count / maxMuscleCount) * 100 : 0;
            return (
              <li key={muscle}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums w-4 text-right">{idx + 1}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{muscle}</span>
                  </div>
                  <span className="text-sm font-serif font-bold text-foreground tabular-nums shrink-0">
                    {count}
                    <span className="text-xs text-muted-foreground ml-1 font-sans font-medium">x</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${pct}%` }} aria-hidden="true" />
                </div>
              </li>
            );
          })}
        </ul>
      </ResponsiveSheetDialog>

      {/* Sessions */}
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">All Sessions</h2>
      {history.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={32} className="text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
          <p className="text-muted-foreground">No completed workouts yet. Start a workout from your plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedHistory.map(wl => (
            <WorkoutSessionCard key={wl.id} log={wl} to={`/portal/history/${wl.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
