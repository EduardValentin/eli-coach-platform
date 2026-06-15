import { Link } from 'react-router';
import { Clock, Dumbbell, ArrowLeftRight } from 'lucide-react';
import { useTraining, type WorkoutLog } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume } from '../../utils/units';

interface WorkoutSessionCardProps {
  log: WorkoutLog;
  /** Destination route for this session — set by the page so routing stays at the page boundary. */
  to: string;
}

export function WorkoutSessionCard({ log, to }: WorkoutSessionCardProps) {
  const { exercises } = useTraining();
  const { weightUnit } = useUnitPreferences();

  const durationMin = log.duration ? Math.round(log.duration / 60) : 0;
  const dateStr = new Date(log.startedAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const exerciseNames = log.exercises
    .map(el => exercises.find(e => e.id === el.exerciseId)?.name)
    .filter(Boolean) as string[];
  const hasSwaps = log.exercises.some(e => e.wasSwapped);
  const totalSets = log.exercises.reduce((t, e) => t + e.sets.length, 0);
  const completedSets = log.exercises.reduce((t, e) => t + e.sets.filter(s => s.completed).length, 0);

  const muscles = new Set<string>();
  log.exercises.forEach(el => {
    exercises.find(e => e.id === el.exerciseId)?.primaryMuscles.forEach(m => muscles.add(m));
  });

  return (
    <Link
      to={to}
      className="block bg-card rounded-2xl border border-border p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{dateStr}</p>
          <p className="font-semibold text-foreground mt-0.5">
            {exerciseNames.slice(0, 3).join(', ')}
            {exerciseNames.length > 3 && (
              <span className="text-muted-foreground"> +{exerciseNames.length - 3}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSwaps && (
            <span className="inline-flex items-center gap-1 text-xs bg-brand-secondary-soft text-brand-secondary rounded-full px-2 py-0.5 font-bold uppercase">
              <ArrowLeftRight size={12} aria-hidden="true" /> Swap
            </span>
          )}
          <span className="text-xs bg-success-soft text-success rounded-full px-2 py-0.5 font-bold uppercase tabular-nums">
            {completedSets}/{totalSets}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden="true" /> {durationMin} min
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell size={12} className="text-brand" aria-hidden="true" /> {formatVolume(log.totalVolume || 0, weightUnit)}
        </span>
      </div>

      {muscles.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {Array.from(muscles).map(m => (
            <span key={m} className="text-xs bg-brand-secondary-soft text-brand-secondary rounded-full px-2 py-0.5">{m}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
