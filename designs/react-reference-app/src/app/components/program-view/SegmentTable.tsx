import { CornerDownRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CardioIntensity } from '../../domain/program';
import { counted } from '../../utils/counted';
import { cn } from '../ui/utils';
import { IntensityValue } from './IntensityValue';
import { DOCUMENT_CELL_CLASS, SEGMENT_EFFORT_COLUMN_CLASS, TABLE_CELL_CLASS, TABLE_HEAD_CLASS, TIME_COLUMN_CLASS } from './tableLayout';

export type SegmentRow =
  | { kind: 'steady'; key: string; time: ReactNode; intensity: CardioIntensity }
  | { kind: 'rounds'; key: string; rounds: number; total: string; intensity: CardioIntensity }
  | { kind: 'work'; key: string; name: ReactNode; time: ReactNode }
  | { kind: 'easy'; key: string; time: ReactNode }
  | { kind: 'empty'; key: string }
  | { kind: 'rest'; key: string; time: ReactNode };

export type SegmentHeads = 'shown' | 'hidden';
export type EffortColumn = keyof typeof SEGMENT_EFFORT_COLUMN_CLASS;
export type SegmentSize = 'viewer' | 'document';

/** The viewer chooses whether to show the column heads and how wide the effort column is; the printed table never shows its heads. */
type SegmentTableLayout = { size: 'viewer'; heads: SegmentHeads; effort: EffortColumn } | { size: 'document' };

type SegmentTableProps = { caption: string; rows: readonly SegmentRow[]; layout: SegmentTableLayout };

type SizeClasses = { table: string; cell: string; time: string; quiet: string; lead: string; rounds: string };

const SIZE_CLASSES: Record<SegmentSize, SizeClasses> = {
  viewer: {
    table: '',
    cell: TABLE_CELL_CLASS,
    time: 'text-base',
    quiet: 'text-sm',
    lead: 'text-base',
    rounds: 'text-base',
  },
  document: {
    table: 'text-document-table',
    cell: cn(DOCUMENT_CELL_CLASS, 'p-0'),
    time: '',
    quiet: '',
    lead: '',
    rounds: '',
  },
};

/** Only a steady segment carries an effort of its own; an interval block states its one effort in the rounds line. */
type Columns = { time: string; effort: string | null };

const DOCUMENT_COLUMNS: Columns = { time: 'pr-[0.6em] text-right sm:w-[5em] sm:pr-[0.9em]', effort: 'sm:w-[7em]' };

const TIME_CLASS = 'font-semibold whitespace-nowrap text-text-primary tabular-nums';
const QUIET_INK = 'text-text-secondary';
const INNER_NAME_CLASS = 'text-left font-medium text-text-primary';
const INNER_LEAD_CLASS = 'relative pl-[1.6em] before:absolute before:bottom-0 before:left-[0.55em] before:w-0.5 before:bg-text-primary';

export function ThenLabel({ size = 'viewer' }: { size?: SegmentSize }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', QUIET_INK, SIZE_CLASSES[size].quiet)}>
      <CornerDownRight aria-hidden="true" className="size-4" />
      then
    </span>
  );
}

/** An easy stretch between exercises: its time, then "easy" in the quiet ink. */
export function EasyTime({ time, size = 'viewer' }: { time: ReactNode; size?: SegmentSize }) {
  return (
    <>
      {time} <span className={cn('font-normal', QUIET_INK, SIZE_CLASSES[size].quiet)}>easy</span>
    </>
  );
}

type InnerRow = Extract<SegmentRow, { kind: 'work' | 'easy' | 'empty' | 'rest' }>;
type GroupEdge = { first: boolean; last: boolean };
type CellPlace = 'lead' | 'middle' | 'end';

function isInner(row: SegmentRow): row is InnerRow {
  return row.kind === 'work' || row.kind === 'easy' || row.kind === 'empty' || row.kind === 'rest';
}

function innerCellClass(edge: GroupEdge, place: CellPlace, size: SegmentSize): string {
  return cn('bg-surface-subtle', {
    'border-t border-border-subtle': !edge.first,
    [cn(INNER_LEAD_CLASS, SIZE_CLASSES[size].lead)]: place === 'lead',
    'before:top-0': place === 'lead' && edge.first,
    'before:-top-px': place === 'lead' && !edge.first,
    'rounded-tl-field': place === 'lead' && edge.first,
    'rounded-bl-field': place === 'lead' && edge.last,
    'rounded-tr-field': place === 'end' && edge.first,
    'rounded-br-field': place === 'end' && edge.last,
  });
}

type InnerParts = { head: ReactNode; headClass: string; time: ReactNode };

function innerPartsOf(row: Exclude<InnerRow, { kind: 'empty' }>, size: SegmentSize): InnerParts {
  switch (row.kind) {
    case 'work':
      return { head: row.name, headClass: INNER_NAME_CLASS, time: row.time };
    case 'easy':
      return { head: <ThenLabel size={size} />, headClass: 'text-left font-normal', time: <EasyTime time={row.time} size={size} /> };
    case 'rest':
      return { head: <span className={cn(QUIET_INK, SIZE_CLASSES[size].quiet)}>Rest between rounds</span>, headClass: 'text-left font-normal', time: row.time };
  }
}

type RowProps = { columns: Columns; size: SegmentSize };

function InnerStep({ row, edge, columns, size }: RowProps & { row: InnerRow; edge: GroupEdge }) {
  const classes = SIZE_CLASSES[size];
  if (row.kind === 'empty') {
    return (
      <tr>
        <td colSpan={columns.effort === null ? 2 : 3} className={cn(classes.cell, innerCellClass(edge, 'lead', size), innerCellClass(edge, 'end', size))}>
          <span className={cn(QUIET_INK, classes.quiet)}>No exercises yet</span>
        </td>
      </tr>
    );
  }
  const parts = innerPartsOf(row, size);
  return (
    <tr data-parity="segment-row">
      <th scope="row" className={cn(classes.cell, parts.headClass, innerCellClass(edge, 'lead', size))}>
        {parts.head}
      </th>
      <td className={cn(classes.cell, columns.time, TIME_CLASS, classes.time, innerCellClass(edge, 'end', size))}>{parts.time}</td>
    </tr>
  );
}

function RoundsRow({ rounds, total, intensity, size }: { rounds: number; total: string; intensity: CardioIntensity; size: SegmentSize }) {
  const classes = SIZE_CLASSES[size];
  return (
    <tr data-parity="segment-row">
      <th scope="rowgroup" colSpan={2} className={cn(classes.cell, 'text-left font-normal text-text-secondary tabular-nums', classes.rounds)}>
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span>
            <span className="font-semibold text-text-primary">{counted(rounds, 'round')}</span>
            {` · ${total}`}
          </span>
          <span className="sr-only">, intensity </span>
          <IntensityValue intensity={intensity} size={size} />
        </span>
      </th>
    </tr>
  );
}

function SteadyRow({ time, intensity, columns, size }: RowProps & { time: ReactNode; intensity: CardioIntensity }) {
  const classes = SIZE_CLASSES[size];
  return (
    <tr data-parity="segment-row">
      <th scope="row" className={cn(classes.cell, 'text-left font-normal', QUIET_INK, classes.quiet)}>
        Steady
      </th>
      <td className={cn(classes.cell, columns.time, TIME_CLASS, classes.time)}>{time}</td>
      {columns.effort !== null && (
        <td className={cn(classes.cell, columns.effort)}>
          <IntensityValue intensity={intensity} size={size} />
        </td>
      )}
    </tr>
  );
}

function columnsOf(layout: SegmentTableLayout, rows: readonly SegmentRow[]): Columns {
  const base: Columns = layout.size === 'document' ? DOCUMENT_COLUMNS : { time: TIME_COLUMN_CLASS, effort: SEGMENT_EFFORT_COLUMN_CLASS[layout.effort] };
  return rows.some(row => row.kind === 'steady') ? base : { ...base, effort: null };
}

export function SegmentTable({ caption, rows, layout }: SegmentTableProps) {
  const { size } = layout;
  const columns = columnsOf(layout, rows);
  const headsHidden = layout.size === 'document' || layout.heads === 'hidden';
  const inner = rows.filter(isInner);
  return (
    <table className={cn('w-full border-separate border-spacing-0', SIZE_CLASSES[size].table)}>
      <caption className="sr-only">{caption}</caption>
      <thead className={cn({ 'sr-only': headsHidden })}>
        <tr>
          <th scope="col" className={cn(TABLE_HEAD_CLASS, 'border-b border-border-subtle text-left')}>
            <span className="sr-only">Step</span>
          </th>
          <th scope="col" className={cn(TABLE_HEAD_CLASS, 'border-b border-border-subtle', columns.time)}>
            Time
          </th>
          {columns.effort !== null && (
            <th scope="col" className={cn(TABLE_HEAD_CLASS, 'border-b border-border-subtle text-left', columns.effort)}>
              Effort
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          if (row.kind === 'steady') return <SteadyRow key={row.key} time={row.time} intensity={row.intensity} columns={columns} size={size} />;
          if (row.kind === 'rounds') return <RoundsRow key={row.key} rounds={row.rounds} total={row.total} intensity={row.intensity} size={size} />;
          const index = inner.indexOf(row);
          return <InnerStep key={row.key} row={row} edge={{ first: index === 0, last: index === inner.length - 1 }} columns={columns} size={size} />;
        })}
      </tbody>
    </table>
  );
}
