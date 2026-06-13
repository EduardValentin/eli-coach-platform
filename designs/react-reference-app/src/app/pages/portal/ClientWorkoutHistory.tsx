import { useState } from 'react';
import { Link } from 'react-router';
import { Calendar, Dumbbell, Clock, TrendingUp, Activity, ArrowLeftRight } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume } from '../../utils/units';
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#121212]">Workout History</h1>
        <p className="text-sm text-neutral-500 mt-1">Review your past training sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Sessions</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{totalSessions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-[#C81D6B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Total Volume</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{formatVolume(totalVolume, weightUnit)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#00796B]" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Avg Volume</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{formatVolume(avgVolume, weightUnit)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-neutral-400" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Avg Duration</span>
          </div>
          <p className="text-xl font-serif font-bold text-[#121212]">{avgDuration} min</p>
        </div>
      </div>

      {/* Most trained muscles */}
      {topMuscles.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Most Trained</h3>
            {hasMore && (
              <button
                type="button"
                onClick={() => setMuscleSheetOpen(true)}
                className="text-xs font-semibold text-[#C81D6B] hover:text-[#a31556] transition-colors"
              >
                View all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {topMuscles.map(({ muscle, count }) => (
              <span
                key={muscle}
                className="text-xs bg-[#00796B]/10 text-[#00796B] rounded-full px-3 py-1.5 font-medium"
              >
                {muscle} <span className="text-[#00796B]/70 ml-1">{count}x</span>
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
        <div className="px-5 pt-6 pb-4 md:px-8 md:pt-8 border-b border-neutral-100">
          <h3 className="text-lg md:text-xl font-semibold text-[#121212] pr-10">Most trained muscles</h3>
          <p className="text-sm text-neutral-500 mt-1">Times trained across {totalSessions} completed {totalSessions === 1 ? 'session' : 'sessions'}.</p>
        </div>
        <ul className="px-5 py-4 md:px-8 md:py-6 overflow-y-auto space-y-3">
          {sortedMuscles.map(({ muscle, count }, idx) => {
            const pct = maxMuscleCount > 0 ? (count / maxMuscleCount) * 100 : 0;
            return (
              <li key={muscle}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-neutral-400 tabular-nums w-4 text-right">{idx + 1}</span>
                    <span className="text-sm font-semibold text-[#121212] truncate">{muscle}</span>
                  </div>
                  <span className="text-sm font-serif font-bold text-[#121212] tabular-nums shrink-0">
                    {count}
                    <span className="text-xs text-neutral-400 ml-1 font-sans font-medium">x</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00796B]"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </ResponsiveSheetDialog>

      {/* Sessions */}
      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">All Sessions</h2>
      {history.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={32} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400">No completed workouts yet. Start a workout from your plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map(wl => {
            const durationMin = wl.duration ? Math.round(wl.duration / 60) : 0;
            const dateStr = new Date(wl.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const exerciseNames = wl.exercises.map(el => exercises.find(e => e.id === el.exerciseId)?.name).filter(Boolean);
            const hasSwaps = wl.exercises.some(e => e.wasSwapped);
            const totalSets = wl.exercises.reduce((t, e) => t + e.sets.length, 0);
            const completedSets = wl.exercises.reduce((t, e) => t + e.sets.filter(s => s.completed).length, 0);
            const muscles = new Set<string>();
            wl.exercises.forEach(el => {
              exercises.find(e => e.id === el.exerciseId)?.primaryMuscles.forEach(m => muscles.add(m));
            });

            return (
              <Link
                key={wl.id}
                to={`/portal/history/${wl.id}`}
                className="block bg-white rounded-2xl border border-neutral-100 p-5 hover:border-neutral-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">{dateStr}</p>
                    <p className="font-semibold text-[#121212] mt-0.5">
                      {exerciseNames.slice(0, 3).join(', ')}
                      {exerciseNames.length > 3 && <span className="text-neutral-400"> +{exerciseNames.length - 3}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasSwaps && (
                      <span className="text-[8px] bg-[#00796B]/10 text-[#00796B] rounded-full px-1.5 py-0.5 font-bold uppercase">
                        <ArrowLeftRight size={8} className="inline -mt-px" /> Swap
                      </span>
                    )}
                    <span className="text-[8px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-bold uppercase">
                      {completedSets}/{totalSets}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> {durationMin} min</span>
                  <span className="flex items-center gap-1"><Dumbbell size={12} className="text-[#C81D6B]" /> {formatVolume(wl.totalVolume || 0, weightUnit)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {Array.from(muscles).map(m => (
                    <span key={m} className="text-[9px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
