import { formatRange, isWorkingSet, numberedSets, type SetSpec } from '../../domain/program';
import { cn } from '../ui/utils';
import { RirValue } from './RirValue';
import { SetMark } from './SetMark';
import { EFFORT_COLUMN_CLASS, PAIRED_RIR_COLUMN_CLASS, TABLE_CELL_CLASS, TABLE_HEAD_CLASS, VALUE_COLUMN_CLASS } from './tableLayout';

type SetTableProps = { exerciseName: string; repsHeading: string; sets: readonly SetSpec[] };

const HEAD_CLASS = cn(TABLE_HEAD_CLASS, 'text-left');
const CELL_CLASS = cn(TABLE_CELL_CLASS, 'text-base');
const SET_COLUMN_CLASS = 'w-12';
const WEIGHT_COLUMN_CLASS = cn(VALUE_COLUMN_CLASS, 'text-right');
const QUIET_CLASS = 'text-sm font-normal text-text-secondary';

function Weight({ set }: { set: SetSpec }) {
  if (set.weightKg !== undefined) {
    return (
      <>
        {set.weightKg} <span className={QUIET_CLASS}>kg</span>
      </>
    );
  }
  return <span className={QUIET_CLASS}>{isWorkingSet(set) ? 'by RIR' : 'lighter'}</span>;
}

export function SetTable({ exerciseName, repsHeading, sets }: SetTableProps) {
  if (sets.length === 0) return null;
  const hasWeight = sets.some(set => set.weightKg !== undefined);
  const rirColumnClass = hasWeight ? PAIRED_RIR_COLUMN_CLASS : EFFORT_COLUMN_CLASS;

  return (
    <table className="w-full border-collapse tabular-nums">
      <caption className="sr-only">{`Sets for ${exerciseName}`}</caption>
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD_CLASS, SET_COLUMN_CLASS)}>
            Set
          </th>
          <th scope="col" className={HEAD_CLASS}>
            {repsHeading}
          </th>
          <th scope="col" className={cn(HEAD_CLASS, rirColumnClass)}>
            RIR
          </th>
          {hasWeight && (
            <th scope="col" className={cn(HEAD_CLASS, WEIGHT_COLUMN_CLASS)}>
              Weight
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {numberedSets(sets).map(({ set, number }, index) => {
          const working = isWorkingSet(set);
          return (
            <tr key={index} data-parity="set-row" className="border-t border-border-subtle">
              <th scope="row" className={cn(CELL_CLASS, SET_COLUMN_CLASS, 'text-left font-normal')}>
                <SetMark kind={set.kind} number={number} />
              </th>
              <td className={cn(CELL_CLASS, { 'font-semibold text-text-primary': working, 'font-medium text-set-warm-up': !working })}>
                {formatRange(set.reps)}
                {!working && <span className="ml-2 text-sm font-normal">warm-up</span>}
              </td>
              <td className={cn(CELL_CLASS, rirColumnClass)}>
                {working ? (
                  <RirValue rir={set.rir} size="numeral" />
                ) : (
                  <>
                    <span aria-hidden="true" className="text-text-secondary">
                      –
                    </span>
                    <span className="sr-only">none</span>
                  </>
                )}
              </td>
              {hasWeight && (
                <td className={cn(CELL_CLASS, WEIGHT_COLUMN_CLASS, 'font-semibold text-text-primary')}>
                  <Weight set={set} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
