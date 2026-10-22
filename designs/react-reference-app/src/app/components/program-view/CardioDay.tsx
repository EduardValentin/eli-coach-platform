import { useId } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import type { CardioSegment, CardioSession } from '../../domain/program';
import { CARDIO_INTENSITY_TEXT, cardioMinutes, roundsText } from '../../domain/programCardio';
import { ColumnBreak, DayHeader } from './DayParts';
import { exerciseName } from './programView';

type Library = ReadonlyMap<string, Exercise>;

const SEGMENT_CLASS = 'grid gap-1 rounded-card border border-l-4 border-border/50 border-l-training-recovery bg-card p-4 shadow-soft';

function Segment({ segment, exercisesById }: { segment: CardioSegment; exercisesById: Library }) {
  const nameOf = (id: string) => exerciseName(id, exercisesById);
  const title = segment.kind === 'steady' ? nameOf(segment.exerciseId) : 'Rounds';
  const amount = segment.kind === 'steady' ? `${segment.minutes} min` : roundsText(segment, nameOf);
  return (
    <li className={SEGMENT_CLASS}>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <ColumnBreak />
      <p className="text-sm font-medium text-text-primary tabular-nums">{amount}</p>
      <ColumnBreak />
      <p className="text-sm text-text-secondary">{CARDIO_INTENSITY_TEXT[segment.intensity]}</p>
    </li>
  );
}

type CardioDayProps = { cardio: CardioSession; exercisesById: Library };

export function CardioDay({ cardio, exercisesById }: CardioDayProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="@container grid gap-4">
      <DayHeader headingId={headingId} name={cardio.name} meta={`${cardioMinutes(cardio)} min`} />
      <ol aria-label="Segments" className="grid items-start gap-3 @3xl:grid-cols-2">
        {cardio.segments.map(segment => (
          <Segment key={segment.id} segment={segment} exercisesById={exercisesById} />
        ))}
      </ol>
    </section>
  );
}
