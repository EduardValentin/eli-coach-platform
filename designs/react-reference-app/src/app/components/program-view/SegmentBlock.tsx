import type { ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { formatRest, type CardioSegment, type RoundsItem, type RoundsSegment } from '../../domain/program';
import { roundsItemAmount, segmentMinutes } from '../../domain/programCardio';
import { cn } from '../ui/utils';
import { ExerciseNameButton } from './ExerciseNameButton';
import { PositionBadge } from './PositionBadge';
import { exerciseNameOf } from './programView';
import { roundsItemExerciseDetail, steadyExerciseDetail } from './sessionExerciseDetails';
import { SegmentTable, type EffortColumn, type SegmentHeads, type SegmentRow } from './SegmentTable';
import { TABLE_BESIDE_CLASS } from './tableLayout';

type Library = ReadonlyMap<string, Exercise>;

type SegmentHeadingProps = { level: 'h4' | 'h5'; number: number | null; id?: string; action?: ReactNode; children: ReactNode };

export function SegmentHeading({ level: Heading, number, id, action, children }: SegmentHeadingProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
      {number !== null && <PositionBadge label={String(number)} size="sm" tone="quiet" />}
      <Heading id={id} className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-base font-semibold text-text-primary">
        {children}
      </Heading>
      {action}
    </div>
  );
}

function roundsRows(segment: RoundsSegment, exercisesById: Library, place: string | undefined): SegmentRow[] {
  const nameOf = (item: RoundsItem) => {
    const exercise = exercisesById.get(item.exerciseId);
    return <ExerciseNameButton exercise={exercise} detail={roundsItemExerciseDetail(segment, item, exercise)} weight="medium" size="in-table" place={place} />;
  };
  const steps: SegmentRow[] =
    segment.items.length === 0
      ? [{ kind: 'empty', key: 'empty' }]
      : segment.items.flatMap(item => [
          { kind: 'work' as const, key: item.id, name: nameOf(item), time: roundsItemAmount(item), intensity: segment.intensity },
          ...(segment.easySeconds > 0 ? [{ kind: 'easy' as const, key: `${item.id}-easy`, time: formatRest(segment.easySeconds) }] : []),
        ]);
  return [
    { kind: 'rounds', key: 'rounds', rounds: segment.rounds, total: `${segmentMinutes(segment)} min` },
    ...steps,
    ...(segment.restBetweenRoundsSeconds > 0 ? [{ kind: 'rest' as const, key: 'rest', time: formatRest(segment.restBetweenRoundsSeconds) }] : []),
  ];
}

type SegmentParts = { title: string; heading: ReactNode; rows: SegmentRow[] };

function partsOf(segment: CardioSegment, exercisesById: Library, place: string | undefined): SegmentParts {
  if (segment.kind === 'rounds') {
    return { title: 'Intervals', heading: <span className="inline-flex min-h-12 items-center">Intervals</span>, rows: roundsRows(segment, exercisesById, place) };
  }
  const exercise = exercisesById.get(segment.exerciseId);
  return {
    title: exerciseNameOf(exercise),
    heading: <ExerciseNameButton exercise={exercise} detail={steadyExerciseDetail(segment, exercise)} place={place} />,
    rows: [{ kind: 'steady', key: 'steady', time: `${segmentMinutes(segment)} min`, intensity: segment.intensity }],
  };
}

type SegmentBlockProps = {
  segment: CardioSegment;
  number: number;
  count: number;
  exercisesById: Library;
  layout: { heads: SegmentHeads; effort: EffortColumn };
  effortHint?: ReactNode;
};

export function SegmentBlock({ segment, number, count, exercisesById, layout, effortHint }: SegmentBlockProps) {
  const several = count > 1;
  const { title, heading, rows } = partsOf(segment, exercisesById, several ? `segment ${number}` : undefined);

  return (
    <article data-parity="segment" className={cn('grid items-start gap-x-8 gap-y-2', TABLE_BESIDE_CLASS)}>
      <SegmentHeading level="h4" number={several ? number : null}>
        {heading}
      </SegmentHeading>
      <SegmentTable caption={`Segment ${number}, ${title}`} rows={rows} layout={layout} effortHint={effortHint} />
    </article>
  );
}
