import type { Exercise } from '../../../context/TrainingContext';
import type { Equipment } from '../../../domain/exercises';
import type { Row, Session } from '../../../domain/program';
import { Table, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useIsDesktop } from '../../ui/use-desktop';
import type { RowTarget } from './BlockWorkspace';
import { ExerciseRowDetails, type RowActions } from './ExerciseRowDetails';
import { ExerciseRowLine, type RowLayout } from './ExerciseRowLine';

type SessionRowsProps = {
  session: Session;
  library: readonly Exercise[];
  equipment: readonly Equipment[];
  actionsFor: (index: number) => RowActions;
  onChangeRow: (row: Row) => void;
  onPickExercise: (target: RowTarget) => void;
};

const COLUMNS = ['Position', 'Exercise', 'Sets', 'Reps', 'RIR', 'Rest', 'Hint'];

export function SessionRows({ session, library, equipment, actionsFor, onChangeRow, onPickExercise }: SessionRowsProps) {
  const layout: RowLayout = useIsDesktop() ? 'table' : 'card';
  const label = `${session.name} exercises`;
  const lines = session.rows.map((row, index) => {
    const exercise = library.find(item => item.id === row.exerciseId);
    const pick = (field: RowTarget['field'], at?: number) => onPickExercise({ sessionId: session.id, rowId: row.id, field, index: at });
    return (
      <ExerciseRowLine
        key={row.id}
        session={session}
        row={row}
        exercise={exercise}
        layout={layout}
        onChange={onChangeRow}
        onPickExercise={() => pick('exercise')}
      >
        <ExerciseRowDetails
          row={row}
          exercise={exercise}
          library={library}
          equipment={equipment}
          actions={actionsFor(index)}
          onChange={onChangeRow}
          onPickSubstitution={at => pick('substitution', at)}
        />
      </ExerciseRowLine>
    );
  });

  if (layout === 'card') {
    return (
      <ul aria-label={label} className="grid gap-3">
        {lines.map(line => (
          <li key={line.key}>{line}</li>
        ))}
      </ul>
    );
  }

  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          {COLUMNS.map(column => (
            <TableHead key={column} className="px-2 text-xs font-medium text-text-secondary">
              {column}
            </TableHead>
          ))}
          <TableHead className="px-2">
            <span className="sr-only">Details</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      {lines}
    </Table>
  );
}
