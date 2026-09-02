import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { Activity, ChevronRight } from 'lucide-react';
import { useTraining } from '../../context/TrainingContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ActiveWorkoutBanner() {
  const { activeWorkout, planInstances } = useTraining();
  const location = useLocation();

  const session = useMemo(() => {
    if (!activeWorkout || activeWorkout.status !== 'in-progress') return null;
    const plan = planInstances.find(p => p.id === activeWorkout.planInstanceId);
    const week = plan?.weeks[activeWorkout.weekIndex];
    const day = week?.days[activeWorkout.dayIndex];
    if (!plan || !day) return null;

    const totalSets = activeWorkout.exercises.reduce((t, e) => t + e.sets.length, 0);
    const completedSets = activeWorkout.exercises.reduce(
      (t, e) => t + e.sets.filter(s => s.completed).length,
      0,
    );
    const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return {
      resumeHref: `/portal/workout/${plan.id}/${activeWorkout.weekIndex}/${activeWorkout.dayIndex}`,
      planName: plan.name,
      dayLabel: `${DAY_NAMES[activeWorkout.dayIndex]} · ${day.type}`,
      progressPercent,
      completedSets,
      totalSets,
    };
  }, [activeWorkout, planInstances]);

  const onWorkoutPage = location.pathname.startsWith('/portal/workout/');

  if (!session || onWorkoutPage) return null;

  return (
    <Link
      to={session.resumeHref}
      aria-label={`Resume workout: ${session.planName}, ${session.dayLabel}, ${session.progressPercent}% complete`}
      className="group relative block mb-5 sm:mb-6 rounded-2xl overflow-hidden bg-text-primary text-white shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <span className="shrink-0 relative flex items-center justify-center w-10 h-10 rounded-full bg-brand/20">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-brand/25 animate-ping [animation-duration:3s] motion-reduce:hidden"
          />
          <Activity size={18} className="relative text-white" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand">In progress</span>
            <span className="text-[10px] font-semibold tabular-nums text-white/60">
              {session.completedSets}/{session.totalSets} sets
            </span>
          </div>
          <p className="text-sm font-semibold truncate">{session.dayLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-sm font-semibold">
          <span className="hidden sm:inline">Resume</span>
          <ChevronRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="h-1 w-full bg-white/10" aria-hidden="true">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: `${session.progressPercent}%` }}
        />
      </div>
    </Link>
  );
}
