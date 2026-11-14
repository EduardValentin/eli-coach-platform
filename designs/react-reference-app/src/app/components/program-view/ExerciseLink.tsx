import type { Exercise } from '../../context/TrainingContext';
import { clientExerciseUrl } from '../../utils/exerciseLinks';
import { cn } from '../ui/utils';
import { useExercisePageHref } from './exercisePageLinks';
import { exerciseNameOf } from './programView';

type ExerciseLinkProps = { exerciseId: string; exercisesById: ReadonlyMap<string, Exercise>; className?: string };

export function ExerciseLink({ exerciseId, exercisesById, className }: ExerciseLinkProps) {
  const exercise = exercisesById.get(exerciseId);
  const linksToPage = useExercisePageHref()(exerciseId) !== null;
  if (!exercise || !linksToPage) return <span className={className}>{exerciseNameOf(exercise)}</span>;
  return (
    <a
      href={clientExerciseUrl(exercise.id, window.location.origin)}
      className={cn('underline decoration-divider decoration-1 underline-offset-2 hover:decoration-current print:no-underline', className)}
    >
      {exercise.name}
    </a>
  );
}
