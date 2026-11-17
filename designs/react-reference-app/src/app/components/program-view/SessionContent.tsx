import { Info } from 'lucide-react';
import { hasCoolDown, positionLabel, type Row, type Session } from '../../domain/program';
import { sessionUnits } from '../../domain/sessionEditing';
import { Collapsible } from '../ui/collapsible';
import { cn } from '../ui/utils';
import { ExerciseNameButton } from './ExerciseNameButton';
import { useOpenExerciseDetail } from './exerciseDetailContent';
import { PositionBadge } from './PositionBadge';
import { Emphasised, parseTemplate, programTemplate, TemplateBody } from './ProgramText';
import { plainText, repsUnit } from './programView';
import { RoutineList, routineItems, type RoutineItem } from './RoutineList';
import { SetTable } from './SetTable';
import { coolDownAmount, coolDownExerciseDetail, rowExerciseDetail, warmUpAmount, warmUpExerciseDetail } from './sessionExerciseDetails';
import { SupersetDescription, SupersetGroup } from './SupersetGroup';
import { SwapListPanel, SwapListTrigger } from './SwapList';
import { TABLE_BESIDE_CLASS } from './tableLayout';
import { rowRestAndTechnique, type RowPlace } from './targets';
import { TargetsSummary } from './TargetsSummary';
import { TextDisclosureGroup, TextDisclosurePanel, TextDisclosureTrigger } from './TextDisclosure';
import type { DayContext } from './weekView';

const WARM_UP_TEXT = 'warm-up';

function WarmUp({ session, context }: { session: Session; context: DayContext }) {
  const { warmUp } = context.texts;
  const hasText = warmUp.length > 0;
  return (
    <TextDisclosureGroup>
      <RoutineList
        title="Warm-up"
        items={warmUpItems(session, context)}
        action={hasText && <TextDisclosureTrigger value={WARM_UP_TEXT}>How to warm up</TextDisclosureTrigger>}
        panel={hasText ? <TextDisclosurePanel value={WARM_UP_TEXT} parts={warmUp} headingLevel="h4" host="subtle" /> : undefined}
      />
    </TextDisclosureGroup>
  );
}

function progressionGuide(context: DayContext): string {
  return parseTemplate(programTemplate(context.view, 'progression'))
    .paragraphs.map(paragraph => plainText(paragraph.body))
    .join(' ');
}

type ExerciseBlockProps = { session: Session; row: Row; context: DayContext; place: RowPlace };

function ExerciseBlock({ session, row, context, place }: ExerciseBlockProps) {
  const openDetail = useOpenExerciseDetail();
  const exercise = context.view.exercisesById.get(row.exerciseId);
  const detail = rowExerciseDetail({
    session,
    row,
    progression: row.progression.kind === 'custom' ? row.progression.text : progressionGuide(context),
    findExercise: id => context.view.exercisesById.get(id),
  });
  const name = exercise?.name ?? 'Exercise removed';
  const swaps = detail?.swaps ?? [];

  return (
    <Collapsible asChild>
      <article data-parity="exercise" className={cn('grid grid-cols-1 gap-x-8 gap-y-1 @3xl:grid-rows-[auto_1fr]', TABLE_BESIDE_CLASS)}>
        <div className="@3xl:col-start-1 @3xl:row-start-1">
          <div className="flex items-center gap-2.5">
            <PositionBadge label={positionLabel(session, row)} size="sm" />
            <h4 className="min-w-0">
              <ExerciseNameButton exercise={exercise} detail={detail} />
            </h4>
          </div>
          <div className="mt-4 flex min-h-8 flex-wrap items-center empty:hidden">
            <TargetsSummary items={rowRestAndTechnique(row, place)} size="sm" />
            {swaps.length > 0 && <SwapListTrigger exerciseName={name} count={swaps.length} />}
          </div>
          {row.progression.kind === 'custom' && (
            <p className="mt-1.5 max-w-prose text-base text-text-secondary">
              <strong className="font-semibold text-text-primary">Coach note.</strong> {row.progression.text}
            </p>
          )}
        </div>
        <div className="self-start @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1">
          <SetTable exerciseName={name} unit={repsUnit(exercise)} sets={row.sets} />
        </div>
        {detail && swaps.length > 0 && (
          <div className="@3xl:col-start-1 @3xl:row-start-2">
            <SwapListPanel
              exerciseName={name}
              swaps={swaps}
              actionFor={swap => ({ kind: 'open', onOpen: opener => openDetail(detail, opener, swap) })}
              note={`Same sets, reps and RIR as ${name}.`}
            />
          </div>
        )}
      </article>
    </Collapsible>
  );
}

function warmUpItems(session: Session, context: DayContext): RoutineItem[] {
  return routineItems(session.warmUp.items, {
    exercisesById: context.view.exercisesById,
    nameOf: (item, exercise) => <ExerciseNameButton exercise={exercise} detail={warmUpExerciseDetail(item, exercise)} weight="medium" />,
    amountOf: warmUpAmount,
    size: 'viewer',
  });
}

function coolDownItems(session: Session, context: DayContext): RoutineItem[] {
  if (!hasCoolDown(session)) return [];
  return routineItems(session.coolDown.items, {
    exercisesById: context.view.exercisesById,
    nameOf: (item, exercise) => <ExerciseNameButton exercise={exercise} detail={coolDownExerciseDetail(item, exercise)} weight="medium" />,
    amountOf: coolDownAmount,
    size: 'viewer',
  });
}

const UNIT_CLASS = 'border-t border-border-subtle p-4 first:border-t-0 @3xl:px-6 @3xl:py-5';

export function SessionContent({ session, context }: { session: Session; context: DayContext }) {
  const units = sessionUnits(session);
  const calibrationText = context.week.calibration ? programTemplate(context.view, 'calibration') : '';

  return (
    <>
      {calibrationText && (
        <p className="flex items-start gap-3 border-b border-border-subtle bg-surface-subtle px-4 py-3 text-sm leading-relaxed text-text-primary @3xl:px-6">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-secondary" />
          <span>
            <Emphasised text={calibrationText} />
          </span>
        </p>
      )}
      <WarmUp session={session} context={context} />
      {units.length > 0 && (
        <ol className="border-t border-border-subtle first:border-t-0">
          {units.map(({ key, rows }) => (
            <li key={key} className={UNIT_CLASS}>
              {rows.length > 1 ? (
                <SupersetGroup description={<SupersetDescription labels={rows.map(row => positionLabel(session, row))} restSeconds={rows[rows.length - 1].restSeconds} />}>
                  {rows.map(row => (
                    <li key={row.id}>
                      <ExerciseBlock session={session} row={row} context={context} place="in-superset" />
                    </li>
                  ))}
                </SupersetGroup>
              ) : (
                <ExerciseBlock session={session} row={rows[0]} context={context} place="alone" />
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="border-t border-border-subtle empty:hidden">
        <RoutineList
          title="Cool-down"
          items={coolDownItems(session, context)}
          note={context.texts.coolDown.length > 0 && <TemplateBody paragraphs={context.texts.coolDown} className="text-sm text-text-secondary" />}
        />
      </div>
    </>
  );
}
