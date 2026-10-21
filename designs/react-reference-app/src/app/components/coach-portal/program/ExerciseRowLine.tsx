import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { positionLabel, setsSummary, type Row, type Session } from '../../../domain/program';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { TableCell, TableRow } from '../../ui/table';
import { cn } from '../../ui/utils';
import { RowTextField } from './RowTextField';
import { formatRest, parseRest, repsSuffix, REST_PROBLEM, rowHint, withField } from './rowFields';

export type RowLayout = 'table' | 'card';

type ExerciseRowLineProps = {
  session: Session;
  row: Row;
  exercise: Exercise | undefined;
  layout: RowLayout;
  onChange: (row: Row) => void;
  onPickExercise: () => void;
  children: ReactNode;
};

export const ROW_COLUMN_COUNT = 6;
const CELL_CLASS = 'px-2 py-2 align-top';

function ExerciseName({ id, exercise, onPick }: { id: string; exercise: Exercise | undefined; onPick: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        id={id}
        type="button"
        onClick={onPick}
        className={cn('grid rounded-sm text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', {
          'text-primary underline underline-offset-4': !exercise,
        })}
      >
        <span className="text-sm font-medium">{exercise?.name ?? 'Choose an exercise'}</span>
        {exercise && exercise.equipment.length > 0 && (
          <span className="text-xs text-text-secondary">{exercise.equipment.join(', ')}</span>
        )}
      </button>
      {exercise?.archivedAt && <Badge tone="muted">archived</Badge>}
    </span>
  );
}

function rowFields({ row, exercise, onChange }: Pick<ExerciseRowLineProps, 'row' | 'exercise' | 'onChange'>, rowLabel: string) {
  return [
    {
      key: 'sets',
      heading: 'Sets',
      node: <span className="text-sm tabular-nums text-text-primary">{setsSummary(row.sets, repsSuffix(exercise))}</span>,
    },
    {
      key: 'rest',
      heading: 'Rest',
      node: (
        <RowTextField
          className="w-20"
          label={`Rest for ${rowLabel}`}
          value={row.restSeconds}
          format={formatRest}
          parse={parseRest}
          problem={REST_PROBLEM}
          onCommit={seconds => onChange(withField(row, 'restSeconds', seconds))}
        />
      ),
    },
  ];
}

export function ExerciseRowLine(props: ExerciseRowLineProps) {
  const { session, row, exercise, layout, onPickExercise, children } = props;
  const [open, setOpen] = useState(false);
  const positionId = useId();
  const nameId = useId();
  const position = positionLabel(session, row);
  const exerciseName = exercise?.name ?? 'new exercise';
  const fields = rowFields(props, `${position} ${exerciseName}`);
  const hint = rowHint(row);
  const toggle = (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label={`${open ? 'Hide' : 'Show'} details for ${exerciseName}`}>
        <ChevronDown aria-hidden="true" className={cn('transition-transform motion-reduce:transition-none', { 'rotate-180': open })} />
      </Button>
    </CollapsibleTrigger>
  );
  const details = (
    <div role="group" aria-labelledby={`${positionId} ${nameId}`} className="grid gap-4 rounded-field bg-surface-subtle p-4">
      {children}
    </div>
  );

  if (layout === 'card') {
    return (
      <Collapsible open={open} onOpenChange={setOpen} asChild>
        <article className="grid gap-3 rounded-field border border-border bg-surface-base p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="flex items-start gap-2">
              <span id={positionId} className="text-sm font-semibold tabular-nums text-text-secondary">
                {position}
              </span>
              <ExerciseName id={nameId} exercise={exercise} onPick={onPickExercise} />
            </h4>
            {toggle}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {fields.map(field => (
              <div key={field.key} className="grid gap-1">
                <dt className="text-xs text-text-secondary">{field.heading}</dt>
                <dd>{field.node}</dd>
              </div>
            ))}
          </dl>
          {hint && <p className="text-xs text-text-secondary">{hint}</p>}
          <CollapsibleContent>{details}</CollapsibleContent>
        </article>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <tbody className="border-b border-border last:border-0">
        <TableRow className="border-0">
          <th id={positionId} scope="row" className={cn(CELL_CLASS, 'pt-3 text-left text-sm font-semibold tabular-nums text-text-secondary')}>
            {position}
          </th>
          <TableCell className={cn(CELL_CLASS, 'whitespace-normal')}>
            <ExerciseName id={nameId} exercise={exercise} onPick={onPickExercise} />
          </TableCell>
          {fields.map(field => (
            <TableCell key={field.key} className={CELL_CLASS}>
              {field.node}
            </TableCell>
          ))}
          <TableCell className={cn(CELL_CLASS, 'pt-3 text-xs text-text-secondary')}>{hint}</TableCell>
          <TableCell className={cn(CELL_CLASS, 'text-right')}>{toggle}</TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <tr>
            <td colSpan={ROW_COLUMN_COUNT} className="px-2 pb-3">
              {details}
            </td>
          </tr>
        </CollapsibleContent>
      </tbody>
    </Collapsible>
  );
}
