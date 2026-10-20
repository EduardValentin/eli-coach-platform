import { ChevronDown } from 'lucide-react';
import { positionLabel, type Block, type ProgramLanguage, type Row, type Session } from '../../domain/program';
import { templateText } from '../../domain/programTemplates';
import type { Exercise } from '../../context/TrainingContext';
import { formatRange, repsSuffix } from '../coach-portal/program/rowFields';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { plainText, restLabel } from './programView';

type SessionTableProps = {
  session: Session;
  block: Block;
  language: ProgramLanguage;
  exercisesById: ReadonlyMap<string, Exercise>;
  mode: 'client' | 'document';
};

const DETAILS_LABEL = 'Cues · video · substitutions · how to progress';

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
        <a href={exercise.videoUrl} target="_blank" rel="noreferrer" className="w-fit text-primary underline">
          Watch video
        </a>
      )}
      {swaps.length > 0 && <p>Swap for: {swaps.join(', ')}</p>}
      <p>{progression}</p>
    </div>
  );
}

function repsOf(row: Row, exercise: Exercise | undefined): string {
  return `${formatRange(row.reps)}${repsSuffix(exercise)}`;
}

export function SessionTable({ session, block, language, exercisesById, mode }: SessionTableProps) {
  const mobility = namesOf(session.warmUp.mobilityExerciseIds, exercisesById);
  const warmUp = plainText(templateText('warmUp', language).text);

  return (
    <section aria-label={session.name} className="grid gap-3">
      <h3 className="text-sm font-semibold text-text-primary">{session.name}</h3>
      <p className="whitespace-pre-line text-sm text-text-secondary">
        {warmUp}
        {mobility.length > 0 && `\nMobility: ${mobility.join(', ')}`}
      </p>
      <Table aria-label={`${session.name} in ${block.split.name}`}>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Exercise</TableHead>
            <TableHead>Sets</TableHead>
            <TableHead>Reps</TableHead>
            <TableHead>RIR</TableHead>
            <TableHead>Rest</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session.rows.flatMap(row => {
            const exercise = exercisesById.get(row.exerciseId);
            const details = <RowDetails row={row} exercise={exercise} language={language} exercisesById={exercisesById} />;
            return [
              <TableRow key={row.id} className={mode === 'client' ? 'border-b-0' : undefined}>
                <TableCell>{positionLabel(session, row)}</TableCell>
                <TableCell>{exercise ? exercise.name : 'Exercise removed'}</TableCell>
                <TableCell>{row.sets}</TableCell>
                <TableCell>{repsOf(row, exercise)}</TableCell>
                <TableCell>{formatRange(row.rir)}</TableCell>
                <TableCell>{restLabel(row.restSeconds)}</TableCell>
              </TableRow>,
              <TableRow key={`${row.id}-details`}>
                <TableCell colSpan={6} className="pt-0">
                  {mode === 'client' ? (
                    <Collapsible>
                      <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-text-secondary">
                        {DETAILS_LABEL}
                        <ChevronDown aria-hidden className="size-3 transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>{details}</CollapsibleContent>
                    </Collapsible>
                  ) : (
                    details
                  )}
                </TableCell>
              </TableRow>,
            ];
          })}
        </TableBody>
      </Table>
    </section>
  );
}
