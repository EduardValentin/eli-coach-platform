import { CirclePlay } from 'lucide-react';
import { useId } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { Badge } from '../ui/badge';
import { linkVariants } from '../ui/link';
import { cn } from '../ui/utils';
import { useOpenExerciseDetail, type ExerciseDetailContent } from './exerciseDetailContent';
import { InlineTextButton } from './InlineTextButton';
import { exerciseNameOf } from './programView';

type NameWeight = 'semibold' | 'medium';

type NameSize = 'base' | 'compact' | 'in-table';

const ROW_CLASS: Record<NameSize, string> = { base: 'min-h-12', compact: 'min-h-10', 'in-table': '' };
const TEXT_SIZE: Record<NameSize, 'base' | 'sm'> = { base: 'base', compact: 'sm', 'in-table': 'base' };
const PLAIN_TEXT_CLASS: Record<NameSize, string> = { base: 'text-base', compact: 'text-sm', 'in-table': 'text-base' };
const PLAIN_WEIGHT_CLASS: Record<NameWeight, string> = { semibold: 'font-semibold', medium: 'font-medium' };

function ExerciseNameWords({ exercise }: { exercise: Exercise }) {
  const words = exercise.name.split(' ');
  const lastWord = words.pop();
  return (
    <>
      {words.length > 0 && `${words.join(' ')} `}
      <span className="whitespace-nowrap">
        {lastWord}
        {exercise.videoUrl && <CirclePlay aria-hidden="true" className="ml-2 inline size-[1em] align-[-0.15em] text-primary" />}
      </span>
    </>
  );
}

export function ExerciseNameMark({ exercise }: { exercise: Exercise }) {
  return (
    <span className={cn(linkVariants({ variant: 'inline' }), 'min-w-0')}>
      <ExerciseNameWords exercise={exercise} />
    </span>
  );
}

function spokenOpens(exercise: Exercise, place: string | undefined): string {
  return [exercise.videoUrl ? 'cues and video' : 'cues', place ? `, ${place}` : ''].join('');
}

type ExerciseNameButtonProps = {
  exercise: Exercise | undefined;
  detail: ExerciseDetailContent | null;
  weight?: NameWeight;
  size?: NameSize;
  place?: string;
};

export function ExerciseNameButton({ exercise, detail, weight = 'semibold', size = 'base', place }: ExerciseNameButtonProps) {
  const openDetail = useOpenExerciseDetail();
  const opensId = useId();

  if (!detail) {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-2 leading-snug text-text-primary', ROW_CLASS[size], PLAIN_TEXT_CLASS[size], PLAIN_WEIGHT_CLASS[weight])}>
        {exerciseNameOf(exercise)}
        {exercise?.archivedAt && <Badge tone="muted">archived</Badge>}
      </span>
    );
  }
  return (
    <>
      <InlineTextButton
        aria-haspopup="dialog"
        aria-describedby={opensId}
        size={TEXT_SIZE[size]}
        weight={weight}
        className={cn('leading-snug', ROW_CLASS[size])}
        onClick={event => openDetail(detail, event.currentTarget)}
      >
        <ExerciseNameWords exercise={detail.exercise} />
      </InlineTextButton>
      <span id={opensId} aria-hidden="true" className="sr-only">
        {spokenOpens(detail.exercise, place)}
      </span>
    </>
  );
}
