import type { CardioSession } from '../../domain/program';
import { firstSegmentIndexOf } from '../../domain/programCardio';
import { cn } from '../ui/utils';
import { DayPage } from './DayPage';
import type { CardioDay } from './documentWeeks';
import { ExerciseLink } from './ExerciseLink';
import { exerciseNameOf, type ProgramView } from './programView';
import { SegmentBlock, SegmentList, type SegmentExerciseName } from './SegmentBlock';
import type { WeekView } from './weekView';
import { LOG_SURFACE_CLASS, WriteInCell } from './WriteInCell';

function CardioSegments({ view, cardio }: { view: ProgramView; cardio: CardioSession }) {
  const firstSegment = firstSegmentIndexOf(cardio);
  const linkedOnceIn =
    (segmentIndex: number): SegmentExerciseName =>
    (exerciseId, reach) =>
      firstSegment.get(exerciseId) === segmentIndex ? (
        <ExerciseLink exerciseId={exerciseId} exercisesById={view.exercisesById} reach={reach} />
      ) : (
        exerciseNameOf(view.exercisesById.get(exerciseId))
      );
  return (
    <SegmentList segments={cardio.segments} size="document">
      {(segment, index) => (
        <SegmentBlock
          segment={segment}
          number={index + 1}
          count={cardio.segments.length}
          exercisesById={view.exercisesById}
          layout={{ size: 'document', exerciseName: linkedOnceIn(index) }}
        />
      )}
    </SegmentList>
  );
}

function CardioLog() {
  return (
    <div className={cn('grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-[6mm] rounded-tile px-[3mm] py-[2.4mm]', LOG_SURFACE_CLASS)}>
      <WriteInCell kind="tick">Done</WriteInCell>
      <WriteInCell kind="entry">Minutes done</WriteInCell>
      <WriteInCell kind="entry">How did it feel?</WriteInCell>
    </div>
  );
}

export function CardioDayPage({ view, week, day }: { view: ProgramView; week: WeekView; day: CardioDay }) {
  return (
    <DayPage week={week} day={day} rhythm="gap">
      <CardioSegments view={view} cardio={day.plan.cardio} />
      <CardioLog />
    </DayPage>
  );
}
