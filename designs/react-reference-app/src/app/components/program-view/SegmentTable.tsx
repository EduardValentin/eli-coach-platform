import { CornerDownRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CardioIntensity } from '../../domain/program';
import { counted } from '../../utils/counted';
import { cn } from '../ui/utils';
import { IntensityValue } from './IntensityValue';
import { GROUP_BRACKET_CLASS } from './SupersetGroup';
import { SEGMENT_EFFORT_COLUMN_CLASS, TABLE_CELL_CLASS, TABLE_HEAD_CLASS, TIME_COLUMN_CLASS } from './tableLayout';

export type SegmentRow =
  | { kind: 'steady'; key: string; time: ReactNode; intensity: CardioIntensity }
  | { kind: 'rounds'; key: string; rounds: number; total: string }
  | { kind: 'work'; key: string; name: ReactNode; time: ReactNode; intensity: CardioIntensity }
  | { kind: 'easy'; key: string; time: ReactNode }
  | { kind: 'empty'; key: string }
  | { kind: 'rest'; key: string; time: ReactNode };

export type SegmentHeads = 'shown' | 'hidden';
export type EffortColumn = keyof typeof SEGMENT_EFFORT_COLUMN_CLASS;

type SegmentTableProps = { caption: string; rows: readonly SegmentRow[]; layout: { heads: SegmentHeads; effort: EffortColumn }; effortHint?: ReactNode };

const TIME_CLASS = 'text-base font-semibold whitespace-nowrap text-text-primary tabular-nums';
const QUIET_CLASS = 'text-sm text-text-secondary';
const IN_BRACKET_CLASS = cn(GROUP_BRACKET_CLASS, 'pl-3');

function ThenLabel() {
  return (
    <span className={cn('inline-flex items-center gap-1.5', QUIET_CLASS)}>
      <CornerDownRight aria-hidden="true" className="size-4" />
      then
    </span>
  );
}

type EasyStepLayout = 'table-row' | 'line';

export function EasyStep({ time, layout, effortClass = '' }: { time: ReactNode; layout: EasyStepLayout; effortClass?: string }) {
  if (layout === 'line') {
    return (
      <p className="flex min-h-10 items-center gap-3">
        <span className="flex-1">
          <ThenLabel />
        </span>
        <span className="text-sm font-semibold text-text-primary tabular-nums">{time}</span>
        <IntensityValue intensity="easy" />
      </p>
    );
  }
  return (
    <tr data-parity="segment-row" className="border-t border-border-subtle">
      <th scope="row" className={cn(TABLE_CELL_CLASS, IN_BRACKET_CLASS, 'text-left font-normal')}>
        <ThenLabel />
      </th>
      <td className={cn(TABLE_CELL_CLASS, TIME_COLUMN_CLASS, TIME_CLASS)}>{time}</td>
      <td className={cn(TABLE_CELL_CLASS, effortClass)}>
        <IntensityValue intensity="easy" />
      </td>
    </tr>
  );
}

type RowParts = { head: ReactNode; headClass: string; time: ReactNode; timeClass: string; effort: CardioIntensity | null; ruled: boolean };

const STEP_HEAD_CLASS = cn('text-left font-normal', QUIET_CLASS);

function partsOf(row: Exclude<SegmentRow, { kind: 'easy' } | { kind: 'empty' }>): RowParts {
  switch (row.kind) {
    case 'steady':
      return { head: 'Steady', headClass: STEP_HEAD_CLASS, time: row.time, timeClass: TIME_CLASS, effort: row.intensity, ruled: false };
    case 'rounds':
      return { head: counted(row.rounds, 'round'), headClass: 'text-left text-base font-semibold text-text-primary', time: row.total, timeClass: cn(QUIET_CLASS, 'whitespace-nowrap tabular-nums'), effort: null, ruled: false };
    case 'work':
      return { head: row.name, headClass: cn(IN_BRACKET_CLASS, 'text-left font-normal'), time: row.time, timeClass: TIME_CLASS, effort: row.intensity, ruled: true };
    case 'rest':
      return { head: 'Rest between rounds', headClass: STEP_HEAD_CLASS, time: row.time, timeClass: TIME_CLASS, effort: null, ruled: true };
  }
}

function Row({ row, effortClass }: { row: SegmentRow; effortClass: string }) {
  if (row.kind === 'easy') return <EasyStep time={row.time} layout="table-row" effortClass={effortClass} />;
  if (row.kind === 'empty') {
    return (
      <tr className="border-t border-border-subtle">
        <td colSpan={3} className={cn(TABLE_CELL_CLASS, IN_BRACKET_CLASS, QUIET_CLASS)}>
          No exercises yet
        </td>
      </tr>
    );
  }
  const parts = partsOf(row);
  return (
    <tr data-parity="segment-row" className={cn({ 'border-t border-border-subtle': parts.ruled })}>
      <th scope="row" className={cn(TABLE_CELL_CLASS, parts.headClass)}>
        {parts.head}
      </th>
      <td className={cn(TABLE_CELL_CLASS, TIME_COLUMN_CLASS, parts.timeClass)}>{parts.time}</td>
      <td className={cn(TABLE_CELL_CLASS, effortClass)}>{parts.effort && <IntensityValue intensity={parts.effort} />}</td>
    </tr>
  );
}

export function SegmentTable({ caption, rows, layout, effortHint }: SegmentTableProps) {
  const effortClass = SEGMENT_EFFORT_COLUMN_CLASS[layout.effort];
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">{caption}</caption>
      <thead className={cn({ 'sr-only': layout.heads === 'hidden' })}>
        <tr className="border-b border-border-subtle">
          <th scope="col" className={cn(TABLE_HEAD_CLASS, 'text-left')}>
            <span className="sr-only">Step</span>
          </th>
          <th scope="col" className={cn(TABLE_HEAD_CLASS, TIME_COLUMN_CLASS)}>
            Time
          </th>
          <th scope="col" className={cn(TABLE_HEAD_CLASS, 'text-left', effortClass)}>
            <span className="inline-flex items-center gap-1">
              Effort
              {effortHint}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <Row key={row.key} row={row} effortClass={effortClass} />
        ))}
      </tbody>
    </table>
  );
}
