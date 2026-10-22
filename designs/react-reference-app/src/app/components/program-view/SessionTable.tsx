import { Fragment } from 'react';
import {
  formatRange,
  isWorkingSet,
  positionLabel,
  setsSummary,
  setText,
  uniformSets,
  workingSets,
  type Block,
  type ProgramLanguage,
  type Row,
  type Session,
} from '../../domain/program';
import { templateText } from '../../domain/programTemplates';
import type { Exercise } from '../../context/TrainingContext';
import { repsSuffix } from '../coach-portal/program/rowFields';
import { WatchVideoButton } from '../WatchVideoButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '../ui/utils';
import { plainText, restLabel } from './programView';

type SessionTableProps = {
  session: Session;
  block: Block;
  language: ProgramLanguage;
  exercisesById: ReadonlyMap<string, Exercise>;
};

const CELL_CLASS = 'px-2 align-top first:pl-0 last:pr-0';

function namesOf(ids: readonly string[], exercisesById: ReadonlyMap<string, Exercise>): string[] {
  return ids.flatMap(id => exercisesById.get(id)?.name ?? []);
}

type RowDetailsProps = { row: Row; exercise: Exercise | undefined; language: ProgramLanguage; exercisesById: ReadonlyMap<string, Exercise> };

function RowDetails({ row, exercise, language, exercisesById }: RowDetailsProps) {
  const swaps = namesOf(row.substitutions, exercisesById);
  const progression = row.progression.kind === 'custom' ? row.progression.text : plainText(templateText('progression', language).text);
  return (
    <div className="grid gap-2 py-2 text-sm text-text-secondary">
      {row.cues && <p>{row.cues}</p>}
      {exercise?.videoUrl && (
        <WatchVideoButton name={exercise.name} videoUrl={exercise.videoUrl} />
      )}
      {swaps.length > 0 && <p>Swap for: {swaps.join(', ')}</p>}
      <p>{progression}</p>
    </div>
  );
}

const PART_SEPARATOR = ' · ';

function Unbroken({ text }: { text: string }) {
  return text.split(PART_SEPARATOR).map((part, index) => (
    <Fragment key={index}>
      {index > 0 && PART_SEPARATOR}
      <span className="whitespace-nowrap">{part}</span>
    </Fragment>
  ));
}

function SetsCell({ row, exercise }: { row: Row; exercise: Exercise | undefined }) {
  const suffix = repsSuffix(exercise);
  if (uniformSets(row.sets)) return <Unbroken text={setsSummary(row.sets, suffix)} />;
  return (
    <ol className="grid gap-0.5">
      {row.sets.flatMap((set, index) =>
        isWorkingSet(set) ? [] : [<li key={`warm-up-${index}`}>{`Warm-up · ${formatRange(set.reps)}${suffix}`}</li>],
      )}
      {workingSets(row.sets).map((set, index) => (
        <li key={index}>
          <Unbroken text={`Set ${index + 1} · ${setText(set, suffix)}`} />
        </li>
      ))}
    </ol>
  );
}

export function SessionTable({ session, block, language, exercisesById }: SessionTableProps) {
  const mobility = namesOf(session.warmUp.mobilityExerciseIds, exercisesById);
  const warmUp = plainText(templateText('warmUp', language).text);

  return (
    <section aria-label={session.name} className="grid grid-cols-1 gap-3">
      <h3 className="text-sm font-semibold text-text-primary">{session.name}</h3>
      <p className="whitespace-pre-line text-sm text-text-secondary">
        {warmUp}
        {mobility.length > 0 && `\nMobility: ${mobility.join(', ')}`}
      </p>
      <Table aria-label={`${session.name} in ${block.split.name}`}>
        <TableHeader>
          <TableRow>
            <TableHead className={CELL_CLASS}>Exercise</TableHead>
            <TableHead className={CELL_CLASS}>Sets</TableHead>
            <TableHead className={CELL_CLASS}>Rest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session.rows.flatMap(row => {
            const exercise = exercisesById.get(row.exerciseId);
            return [
              <TableRow key={row.id}>
                <th scope="row" className={cn(CELL_CLASS, 'py-3 text-left font-medium text-text-primary')}>
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-surface-inverted px-1 text-xs font-semibold text-surface-inverted-foreground tabular-nums">
                      {positionLabel(session, row)}
                    </span>{' '}
                    <span className="min-w-0">{exercise ? exercise.name : 'Exercise removed'}</span>
                  </span>
                </th>
                <TableCell className={cn(CELL_CLASS, 'py-3 tabular-nums')}>
                  <SetsCell row={row} exercise={exercise} />
                </TableCell>
                <TableCell className={cn(CELL_CLASS, 'py-3 whitespace-nowrap tabular-nums')}>{restLabel(row.restSeconds)}</TableCell>
              </TableRow>,
              <TableRow key={`${row.id}-details`}>
                <TableCell colSpan={3} className={cn(CELL_CLASS, 'pt-0 pb-1')}>
                  <RowDetails row={row} exercise={exercise} language={language} exercisesById={exercisesById} />
                </TableCell>
              </TableRow>,
            ];
          })}
        </TableBody>
      </Table>
    </section>
  );
}
