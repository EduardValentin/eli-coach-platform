import { Link } from 'react-router';
import { Clock, Dumbbell, ArrowLeftRight } from 'lucide-react';
import { useTraining, type WorkoutLog } from '../../context/TrainingContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatVolume } from '../../utils/units';
import { Badge } from '../ui/badge';

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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const exerciseNames = log.exercises
    .map((el) => exercises.find((e) => e.id === el.exerciseId)?.name)
    .filter(Boolean) as string[];
  const hasSwaps = log.exercises.some((e) => e.wasSwapped);
  const totalSets = log.exercises.reduce((t, e) => t + e.sets.length, 0);
  const completedSets = log.exercises.reduce(
    (t, e) => t + e.sets.filter((s) => s.completed).length,
    0,
  );

  const muscles = new Set<string>();
  log.exercises.forEach((el) => {
    exercises
      .find((e) => e.id === el.exerciseId)
      ?.primaryMuscles.forEach((m) => muscles.add(m));
  });

  return (
    <Link
      to={to}
      className="block bg-card rounded-card border border-border p-5 hover:border-text-primary/20 hover:shadow-card transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-text-secondary font-medium">{dateStr}</p>
          <p className="font-semibold text-text-primary mt-0.5">
            {exerciseNames.slice(0, 3).join(', ')}
            {exerciseNames.length > 3 && (
              <span className="text-text-secondary">
                {' '}
                +{exerciseNames.length - 3}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSwaps && (
            <Badge variant="brand-secondary">
              <ArrowLeftRight aria-hidden="true" /> Swap
            </Badge>
          )}
          <Badge variant="success" className="tabular-nums">
            {completedSets}/{totalSets}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden="true" /> {durationMin} min
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell size={12} className="text-primary" aria-hidden="true" />{' '}
          {formatVolume(log.totalVolume || 0, weightUnit)}
        </span>
      </div>

      {muscles.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {Array.from(muscles).map((m) => (
            <Badge key={m} variant="brand-secondary">
              {m}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
