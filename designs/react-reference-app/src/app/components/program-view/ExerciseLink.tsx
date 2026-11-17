import type { Exercise } from '../../context/TrainingContext';
import { clientExerciseUrl } from '../../utils/exerciseLinks';
import { linkVariants } from '../ui/link';
import { cn } from '../ui/utils';
import { exerciseNameOf } from './programView';

type ExerciseLinkProps = { exerciseId: string; exercisesById: ReadonlyMap<string, Exercise>; className?: string };

export function ExerciseLink({ exerciseId, exercisesById, className }: ExerciseLinkProps) {
  const exercise = exercisesById.get(exerciseId);
  if (!exercise) return <span className={className}>{exerciseNameOf(exercise)}</span>;
  return (
    <a
      href={clientExerciseUrl(exercise.id, window.location.origin)}
      className={cn(linkVariants({ variant: 'inline' }), className)}
    >
      {exercise.name}
    </a>
  );
}
