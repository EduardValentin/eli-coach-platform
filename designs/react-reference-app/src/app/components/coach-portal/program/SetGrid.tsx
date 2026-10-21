import { Copy, Plus, X } from 'lucide-react';
import { formatRange, isWorkingSet, workingSets, type Row, type SetSpec } from '../../../domain/program';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { RowTextField } from './RowTextField';
import { formatRest, parseRange, parseRest, RANGE_PROBLEM, REST_PROBLEM, withField } from './rowFields';

type SetGridProps = { row: Row; exerciseName: string; repsSuffix: string; onChange: (row: Row) => void };

const HEAD_CLASS = 'px-1 pb-1 text-left font-normal';

function setLabel(sets: SetSpec[], index: number): string {
  const set = sets[index];
  const position = sets.slice(0, index + 1).filter(other => other.kind === set.kind).length;
  return isWorkingSet(set) ? `Set ${position}` : `Warm-up ${position}`;
}

export function SetGrid({ row, exerciseName, repsSuffix, onChange }: SetGridProps) {
  const { sets } = row;
  const changeSets = (next: SetSpec[]) => onChange(withField(row, 'sets', next));
  const changeSet = (index: number, set: SetSpec) => changeSets(sets.map((other, at) => (at === index ? set : other)));
  const working = workingSets(sets);
  const [firstWorking] = working;
  const lastWorking = working.at(-1);

  return (
    <div className="grid gap-3">
      <table className="w-full max-w-md text-sm">
        <caption className="sr-only">{`Sets for ${exerciseName}`}</caption>
        <thead>
          <tr className={LABEL_CLASS}>
            <th scope="col" className={HEAD_CLASS}>
              Set
            </th>
            <th scope="col" className={HEAD_CLASS}>
              Reps
            </th>
            <th scope="col" className={HEAD_CLASS}>
              RIR
            </th>
            <th scope="col" className={HEAD_CLASS}>
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set, index) => {
            const label = setLabel(sets, index);
            return (
              <tr key={index}>
                <th scope="row" className="px-1 py-1 text-left font-medium whitespace-nowrap text-text-secondary tabular-nums">
                  {label}
                </th>
                <td className="px-1 py-1">
                  <RowTextField
                    className="w-20"
                    label={`${label} reps`}
                    value={set.reps}
                    format={formatRange}
                    parse={parseRange}
                    problem={RANGE_PROBLEM}
                    suffix={repsSuffix || undefined}
                    onCommit={reps => changeSet(index, { ...set, reps })}
                  />
                </td>
                <td className="px-1 py-1">
                  {isWorkingSet(set) && (
                    <RowTextField
                      className="w-16"
                      label={`${label} RIR`}
                      value={set.rir}
                      format={formatRange}
                      parse={parseRange}
                      problem={RANGE_PROBLEM}
                      onCommit={rir => changeSet(index, { ...set, rir })}
                    />
                  )}
                </td>
                <td className="px-1 py-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${label.toLowerCase()}`}
                    disabled={isWorkingSet(set) && working.length === 1}
                    onClick={() => changeSets(sets.filter((_, at) => at !== index))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="grid gap-1">
          <span className={LABEL_CLASS}>Rest</span>
          <RowTextField
            className="w-20"
            label="Rest"
            value={row.restSeconds}
            format={formatRest}
            parse={parseRest}
            problem={REST_PROBLEM}
            onCommit={seconds => onChange(withField(row, 'restSeconds', seconds))}
          />
        </label>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="xs"
            disabled={working.length < 2}
            onClick={() => changeSets(sets.map(set => (isWorkingSet(set) ? structuredClone(firstWorking) : set)))}
          >
            <Copy aria-hidden="true" />
            Apply set 1 to all
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={!lastWorking}
            onClick={() => lastWorking && changeSets([...sets, structuredClone(lastWorking)])}
          >
            <Plus aria-hidden="true" />
            Add set
          </Button>
        </div>
      </div>
    </div>
  );
}
