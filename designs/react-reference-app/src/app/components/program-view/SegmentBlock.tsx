import type { ReactNode } from 'react';
import { formatRest, type CardioSegment, type RoundsItem, type RoundsSegment } from '../../domain/program';
import { roundsItemAmount, segmentMinutes } from '../../domain/programCardio';
import type { LinkReach } from '../ui/link';
import { cn } from '../ui/utils';
import { ExerciseNameButton } from './ExerciseNameButton';
import { PositionBadge } from './PositionBadge';
import { exerciseNameOf, type ExerciseLibrary } from './programView';
import { roundsItemExerciseDetail, steadyExerciseDetail } from './sessionExerciseDetails';
import { SegmentTable, type EffortColumn, type SegmentHeads, type SegmentRow, type SegmentSize } from './SegmentTable';
import { TABLE_BESIDE_CLASS } from './tableLayout';

type SegmentHeadingLevel = 'h4' | 'h5';

const HEADING_CLASSES: Record<SegmentSize, { frame: string; text: string; badge: 'sm' | 'document' }> = {
  viewer: { frame: '', text: 'text-base', badge: 'sm' },
  document: { frame: 'min-h-document-row', text: 'text-document-table', badge: 'document' },
};

type SegmentHeadingProps = { level: SegmentHeadingLevel; size: SegmentSize; number: number | null; id?: string; action?: ReactNode; children: ReactNode };

export function SegmentHeading({ level: Heading, size, number, id, action, children }: SegmentHeadingProps) {
  const classes = HEADING_CLASSES[size];
  return (
    <div className={cn('flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1', classes.frame)}>
      {number !== null && <PositionBadge label={String(number)} size={classes.badge} />}
      <Heading id={id} className={cn('flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-semibold text-text-primary', classes.text)}>
        {children}
      </Heading>
      {action}
    </div>
  );
}

/** How a printed session names an exercise, such as a link the first time it appears and plain text after. */
export type SegmentExerciseName = (exerciseId: string, reach: LinkReach) => ReactNode;

type SegmentBlockLayout = { size: 'viewer'; heads: SegmentHeads; effort: EffortColumn } | { size: 'document'; exerciseName: SegmentExerciseName };

function namesOf(layout: SegmentBlockLayout): SegmentExerciseName | null {
  return layout.size === 'document' ? layout.exerciseName : null;
}

type NameSource = { exercisesById: ExerciseLibrary; place: string | undefined; exerciseName: SegmentExerciseName | null };

function roundsRows(segment: RoundsSegment, { exercisesById, place, exerciseName }: NameSource): SegmentRow[] {
  const nameOf = (item: RoundsItem) => {
    if (exerciseName) return exerciseName(item.exerciseId, 'line');
    const exercise = exercisesById.get(item.exerciseId);
    return <ExerciseNameButton exercise={exercise} detail={roundsItemExerciseDetail(segment, item, exercise)} weight="medium" size="in-table" place={place} />;
  };
  const steps: SegmentRow[] =
    segment.items.length === 0
      ? [{ kind: 'empty', key: 'empty' }]
      : segment.items.flatMap(item => [
          { kind: 'work' as const, key: item.id, name: nameOf(item), time: roundsItemAmount(item) },
          ...(segment.easySeconds > 0 ? [{ kind: 'easy' as const, key: `${item.id}-easy`, time: formatRest(segment.easySeconds) }] : []),
        ]);
  return [
    { kind: 'rounds', key: 'rounds', rounds: segment.rounds, total: `${segmentMinutes(segment)} min`, intensity: segment.intensity },
    ...steps,
    ...(segment.restBetweenRoundsSeconds > 0 ? [{ kind: 'rest' as const, key: 'rest', time: formatRest(segment.restBetweenRoundsSeconds) }] : []),
  ];
}

type SegmentParts = { title: string; heading: ReactNode; rows: SegmentRow[] };

function partsOf(segment: CardioSegment, names: NameSource): SegmentParts {
  if (segment.kind === 'rounds') {
    const title = 'Intervals';
    return { title, heading: names.exerciseName ? title : <span className="inline-flex min-h-12 items-center">{title}</span>, rows: roundsRows(segment, names) };
  }
  const exercise = names.exercisesById.get(segment.exerciseId);
  return {
    title: exerciseNameOf(exercise),
    heading: names.exerciseName ? (
      names.exerciseName(segment.exerciseId, 'touch')
    ) : (
      <ExerciseNameButton exercise={exercise} detail={steadyExerciseDetail(segment, exercise)} place={names.place} />
    ),
    rows: [{ kind: 'steady', key: 'steady', time: `${segmentMinutes(segment)} min`, intensity: segment.intensity }],
  };
}

const HEADING_LEVEL: Record<SegmentSize, SegmentHeadingLevel> = { viewer: 'h4', document: 'h5' };

/** In the document a segment's name stands in the term column beside its table from `sm`, and above it on a phone. */
const SIZE_CLASS: Record<SegmentSize, string> = {
  viewer: cn('gap-x-8', TABLE_BESIDE_CLASS),
  document: 'sm:grid-cols-[minmax(0,var(--document-term-column))_minmax(0,22em)] sm:gap-x-(--document-term-gap)',
};

type SegmentBlockProps = { segment: CardioSegment; number: number; count: number; exercisesById: ExerciseLibrary; layout: SegmentBlockLayout };

export function SegmentBlock({ segment, number, count, exercisesById, layout }: SegmentBlockProps) {
  const { size } = layout;
  const several = count > 1;
  const { title, heading, rows } = partsOf(segment, { exercisesById, place: several ? `segment ${number}` : undefined, exerciseName: namesOf(layout) });
  return (
    <article data-parity="segment" className={cn('grid items-start gap-y-2', SIZE_CLASS[size])}>
      <SegmentHeading level={HEADING_LEVEL[size]} size={size} number={several ? number : null}>
        {heading}
      </SegmentHeading>
      <SegmentTable caption={`Segment ${number}, ${title}`} rows={rows} layout={layout.size === 'document' ? { size: 'document' } : layout} />
    </article>
  );
}

const SEGMENT_ITEM_CLASS: Record<SegmentSize, string> = {
  viewer: 'p-4 @3xl:px-6 @3xl:py-5',
  document: 'not-first:pt-document-paragraph not-last:pb-document-paragraph',
};

type SegmentListProps = {
  segments: readonly CardioSegment[];
  size: SegmentSize;
  className?: string;
  children: (segment: CardioSegment, index: number) => ReactNode;
};

export function SegmentList({ segments, size, className, children }: SegmentListProps) {
  return (
    <ol className={className}>
      {segments.map((segment, index) => (
        <li key={segment.id} className={cn('border-t border-border-subtle first:border-t-0', SEGMENT_ITEM_CLASS[size])}>
          {children(segment, index)}
        </li>
      ))}
    </ol>
  );
}
