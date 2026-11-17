import { clientExerciseUrl } from '../../utils/exerciseLinks';
import { linkVariants, type LinkReach } from '../ui/link';
import { cn } from '../ui/utils';
import { exerciseNameOf, type ExerciseLibrary } from './programView';

type ExerciseLinkProps = { exerciseId: string; exercisesById: ExerciseLibrary; reach?: LinkReach; className?: string };

export function ExerciseLink({ exerciseId, exercisesById, reach, className }: ExerciseLinkProps) {
  const exercise = exercisesById.get(exerciseId);
  if (!exercise) return <span className={className}>{exerciseNameOf(exercise)}</span>;
  return (
    <a href={clientExerciseUrl(exercise.id, window.location.origin)} className={cn(linkVariants({ variant: 'inline', reach }), className)}>
      {exercise.name}
    </a>
  );
}
