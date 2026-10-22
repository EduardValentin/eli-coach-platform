import { useId, type ReactNode } from 'react';
import { ChevronDown, Timer } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { formatRange, isWorkingSet, positionLabel, type ProgramLanguage, type Row, type Session, type SetSpec } from '../../domain/program';
import { estimatedMinutes } from '../../domain/programSuggestions';
import { templateText } from '../../domain/programTemplates';
import { LABEL_CLASS } from '../typography';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../ui/utils';
import { WatchVideoButton } from '../WatchVideoButton';
import { ColumnBreak, DayHeader, Dot, RoutineCard } from './DayParts';
import { coolDownLines, plainText, restLabel, warmUpLines } from './programView';

type Library = ReadonlyMap<string, Exercise>;

function namesOf(ids: readonly string[], exercisesById: Library): string[] {
  return ids.flatMap(id => exercisesById.get(id)?.name ?? []);
}

function repsText(set: SetSpec, exercise: Exercise | undefined): string {
  const reps = formatRange(set.reps);
  if (exercise?.measuredIn === 'time') return `${reps} s`;
  return exercise?.perSide ? `${reps} reps per side` : `${reps} reps`;
}

function weightText(set: SetSpec): string | null {
  if (set.weightKg !== undefined) return `${set.weightKg} kg`;
  return isWorkingSet(set) ? 'by RIR' : null;
}

function SetLine({ set, index, exercise }: { set: SetSpec; index: number; exercise: Exercise | undefined }) {
  const working = isWorkingSet(set);
  const weight = weightText(set);
  return (
    <li
      className={cn('grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-3 py-2.5 text-sm tabular-nums', {
        'text-text-secondary': !working,
        'text-text-primary': working,
      })}
    >
      <span className="text-xs font-medium text-text-secondary">{`Set ${index + 1}`}</span>
      <ColumnBreak />
      <span>
        {!working && (
          <>
            <span>Warm-up</span>
            <Dot />
          </>
        )}
        <span className="whitespace-nowrap">{repsText(set, exercise)}</span>
        {working && (
          <>
            <Dot />
            <span className="whitespace-nowrap">{`RIR ${formatRange(set.rir)}`}</span>
          </>
        )}
      </span>
      {weight && (
        <>
          <ColumnBreak />
          <span
            className={cn('text-right whitespace-nowrap', {
              'font-semibold': set.weightKg !== undefined,
              'text-xs text-text-secondary': set.weightKg === undefined,
            })}
          >
            {weight}
          </span>
        </>
      )}
    </li>
  );
}

type ExerciseCardProps = { session: Session; row: Row; exercisesById: Library; language: ProgramLanguage };

function ExerciseDetails({ row, exercise, exercisesById, language }: { row: Row; exercise: Exercise | undefined; exercisesById: Library; language: ProgramLanguage }) {
  const swaps = namesOf(row.substitutions, exercisesById);
  const progression = row.progression.kind === 'custom' ? row.progression.text : plainText(templateText('progression', language).text);
  return (
    <Collapsible className="-mb-1 border-t border-border-subtle">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-2 text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Cues, video and swaps
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2.5 pb-3 text-sm leading-relaxed text-text-primary">
        {row.cues && <p>{row.cues}</p>}
        {exercise?.videoUrl && <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} />}
        {swaps.length > 0 && <p>{`Swap for: ${swaps.join(', ')}`}</p>}
        <p className="text-text-secondary">{progression}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ExerciseCard({ session, row, exercisesById, language }: ExerciseCardProps) {
  const headingId = useId();
  const exercise = exercisesById.get(row.exerciseId);

  return (
    <article aria-labelledby={headingId} className="grid gap-3 rounded-card border border-border/50 bg-card p-4 shadow-soft">
      <div className="grid gap-2">
        <h4 id={headingId} className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-inverted text-xs font-semibold text-surface-inverted-foreground tabular-nums">
            {positionLabel(session, row)}
          </span>{' '}
          <span className="min-w-0 text-base leading-snug font-semibold text-text-primary">{exercise?.name ?? 'Exercise removed'}</span>
        </h4>
        {exercise && exercise.primaryMuscles.length > 0 && (
          <ul aria-label="Muscles" className="flex flex-wrap gap-1 pl-11">
            {exercise.primaryMuscles.map(muscle => (
              <li key={muscle}>
                <Badge tone="muted">{muscle}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ol aria-label="Sets" className="divide-y divide-border-subtle rounded-control bg-surface-subtle px-3">
        {row.sets.map((set, index) => (
          <SetLine key={index} set={set} index={index} exercise={exercise} />
        ))}
      </ol>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Timer aria-hidden="true" className="size-4" />
          <span>{`Rest ${restLabel(row.restSeconds)}`}</span>
        </span>
        {row.tempo && <span>{`Tempo ${row.tempo}`}</span>}
      </p>
      <ExerciseDetails row={row} exercise={exercise} exercisesById={exercisesById} language={language} />
    </article>
  );
}

function groupsOf(session: Session): Row[][] {
  const groups: Row[][] = [];
  for (const row of session.rows) {
    const previous = groups.at(-1)?.[0];
    const joinsPrevious = previous !== undefined && row.supersetGroup !== undefined && previous.supersetGroup === row.supersetGroup && previous.slot === row.slot;
    if (joinsPrevious) groups[groups.length - 1].push(row);
    else groups.push([row]);
  }
  return groups;
}

function Superset({ children }: { children: ReactNode }) {
  const labelId = useId();
  return (
    <li className="grid gap-2 @3xl:col-span-2">
      <p id={labelId} className={LABEL_CLASS}>
        Superset
      </p>
      <ol aria-labelledby={labelId} className="grid items-start gap-2 border-l-2 border-brand/40 pl-3 @3xl:grid-cols-2">
        {children}
      </ol>
    </li>
  );
}

type SessionDayProps = { session: Session; exercisesById: Library; language: ProgramLanguage };

export function SessionDay({ session, exercisesById, language }: SessionDayProps) {
  const headingId = useId();
  const warmUp = warmUpLines(session, exercisesById);
  const item = (row: Row) => (
    <li key={row.id}>
      <ExerciseCard session={session} row={row} exercisesById={exercisesById} language={language} />
    </li>
  );

  return (
    <section aria-labelledby={headingId} className="@container grid gap-4">
      <DayHeader headingId={headingId} name={session.name} meta={`~${estimatedMinutes(session)} min`} />
      {warmUp.length > 0 && <RoutineCard title="Warm-up" listLabel="Warm-up exercises" lines={warmUp} />}
      <ol className="grid items-start gap-3 @3xl:grid-cols-2">
        {groupsOf(session).map(rows =>
          rows.length > 1 ? <Superset key={rows[0].id}>{rows.map(item)}</Superset> : item(rows[0]),
        )}
      </ol>
      {session.coolDown.enabled && (
        <RoutineCard title="Cool-down" listLabel="Cool-down stretches" note={session.coolDown.note} lines={coolDownLines(session, exercisesById)} />
      )}
    </section>
  );
}
