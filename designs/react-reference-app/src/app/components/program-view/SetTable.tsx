import type { ReactNode } from 'react';
import { formatRange, isWorkingSet, numberedSets, type SetSpec } from '../../domain/program';
import { cn } from '../ui/utils';
import { RirValue } from './RirValue';
import { SetMark } from './SetMark';
import { GROUP_BRACKET_CLASS } from './SupersetGroup';
import { DOCUMENT_CELL_CLASS, EFFORT_COLUMN_CLASS, PAIRED_RIR_COLUMN_CLASS, TABLE_CELL_CLASS, TABLE_HEAD_CLASS, VALUE_COLUMN_CLASS } from './tableLayout';

/** What a warm-up set shows for RIR, which it does not have. */
export const WARM_UP_RIR_MARK = '–';

type SetTableProps = { exerciseName: string; unit: string; sets: readonly SetSpec[] };

type SetRowsSize = 'viewer' | 'document';
type WeightColumn = 'shown' | 'none';
type SetGroup = 'single' | 'superset';

const HEAD_CLASS = cn(TABLE_HEAD_CLASS, 'text-left');
const SET_COLUMN_CLASS = 'w-12';
const WEIGHT_COLUMN_CLASS = cn(VALUE_COLUMN_CLASS, 'text-right');

function rirColumnClass(weight: WeightColumn): string {
  return weight === 'shown' ? PAIRED_RIR_COLUMN_CLASS : EFFORT_COLUMN_CLASS;
}

type SizeClasses = {
  row: string;
  cell: string;
  laterCell: string;
  setCell: string;
  repsCell: string;
  rirCell: (weight: WeightColumn) => string;
  weightCell: string;
  quiet: string;
  unit: string;
  warmUpNote: string;
};

const SIZE_CLASSES: Record<SetRowsSize, SizeClasses> = {
  viewer: {
    row: 'border-t border-border-subtle',
    cell: cn(TABLE_CELL_CLASS, 'text-base'),
    laterCell: '',
    setCell: SET_COLUMN_CLASS,
    repsCell: 'pr-3 whitespace-nowrap',
    rirCell: rirColumnClass,
    weightCell: WEIGHT_COLUMN_CLASS,
    quiet: 'text-sm font-normal text-text-secondary',
    unit: 'ml-1 text-sm font-normal text-text-secondary',
    warmUpNote: 'ml-2 text-sm font-normal',
  },
  document: {
    row: '',
    cell: cn(DOCUMENT_CELL_CLASS, 'px-1.5 py-0 text-document-table whitespace-nowrap tabular-nums'),
    laterCell: 'border-t border-t-border-subtle',
    setCell: '',
    repsCell: '',
    rirCell: () => '',
    weightCell: '',
    quiet: 'font-normal text-text-secondary',
    unit: 'ml-[0.3em] text-document-note font-normal text-text-secondary',
    warmUpNote: 'ml-1.5 text-document-note font-normal',
  },
};

const RIR_SIZE: Record<SetRowsSize, 'numeral' | 'inline'> = { viewer: 'numeral', document: 'inline' };

function Weight({ set, classes }: { set: SetSpec; classes: SizeClasses }) {
  if (set.weightKg !== undefined) {
    return (
      <>
        {set.weightKg} <span className={classes.quiet}>kg</span>
      </>
    );
  }
  if (isWorkingSet(set)) return null;
  return <span className={classes.quiet}>lighter</span>;
}

type SetRowsProps = {
  sets: readonly SetSpec[];
  weight: WeightColumn;
  size?: SetRowsSize;
  group?: SetGroup;
  exerciseName?: string;
  unit?: string;
  trailing?: ReactNode;
};

export function SetRows({ sets, weight, size = 'viewer', group = 'single', exerciseName, unit, trailing }: SetRowsProps) {
  const classes = SIZE_CLASSES[size];
  return (
    <>
      {numberedSets(sets).map(({ set, number }, index) => {
        const working = isWorkingSet(set);
        const cell = cn(classes.cell, { [classes.laterCell]: index > 0 });
        return (
          <tr key={index} data-parity="set-row" className={classes.row || undefined}>
            <th scope="row" className={cn(cell, classes.setCell, 'text-left font-normal', { [GROUP_BRACKET_CLASS]: group === 'superset' })}>
              {exerciseName && <span className="sr-only">{`${exerciseName}, `}</span>}
              <SetMark kind={set.kind} number={number} size={size} />
            </th>
            <td className={cn(cell, classes.repsCell, { 'font-semibold text-text-primary': working, 'font-medium text-set-warm-up': !working })}>
              {formatRange(set.reps)}
              {unit && <span className={classes.unit}>{unit}</span>}
              {!working && (
                <>
                  <span className="sr-only">, </span>
                  <span className={classes.warmUpNote}>warm-up</span>
                </>
              )}
            </td>
            <td className={cn(cell, classes.rirCell(weight))}>
              {working ? (
                <RirValue rir={set.rir} size={RIR_SIZE[size]} />
              ) : (
                <>
                  <span aria-hidden="true" className="text-text-secondary">
                    {WARM_UP_RIR_MARK}
                  </span>
                  <span className="sr-only">none</span>
                </>
              )}
            </td>
            {weight === 'shown' && (
              <td className={cn(cell, classes.weightCell, 'font-semibold text-text-primary')}>
                <Weight set={set} classes={classes} />
              </td>
            )}
            {trailing}
          </tr>
        );
      })}
    </>
  );
}

export function SetTable({ exerciseName, unit, sets }: SetTableProps) {
  if (sets.length === 0) return null;
  const weight: WeightColumn = sets.some(set => set.weightKg !== undefined) ? 'shown' : 'none';

  return (
    <table className="w-full border-collapse tabular-nums">
      <caption className="sr-only">{`Sets for ${exerciseName}`}</caption>
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD_CLASS, SET_COLUMN_CLASS)}>
            Set
          </th>
          <th scope="col" className={HEAD_CLASS}>
            Reps
          </th>
          <th scope="col" className={cn(HEAD_CLASS, rirColumnClass(weight))}>
            RIR
          </th>
          {weight === 'shown' && (
            <th scope="col" className={cn(HEAD_CLASS, WEIGHT_COLUMN_CLASS)}>
              Weight
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        <SetRows sets={sets} weight={weight} unit={unit} />
      </tbody>
    </table>
  );
}
