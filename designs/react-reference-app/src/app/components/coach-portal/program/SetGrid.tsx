import { Copy, Plus, X } from 'lucide-react';
import { formatRange, type Row, type SetSpec } from '../../../domain/program';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { RowTextField } from './RowTextField';
import { formatRest, parseRange, parseRest, RANGE_PROBLEM, REST_PROBLEM, withField } from './rowFields';

type SetGridProps = { row: Row; exerciseName: string; repsSuffix: string; onChange: (row: Row) => void };

const HEAD_CLASS = 'px-1 pb-1 text-left font-normal';

function copyOf(set: SetSpec): SetSpec {
  return { reps: { ...set.reps }, rir: { ...set.rir } };
}

export function SetGrid({ row, exerciseName, repsSuffix, onChange }: SetGridProps) {
  const { sets } = row;
  const changeSets = (next: SetSpec[]) => onChange(withField(row, 'sets', next));
  const changeSet = (index: number, set: SetSpec) => changeSets(sets.map((other, at) => (at === index ? set : other)));

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
            const n = index + 1;
            return (
              <tr key={index}>
                <th scope="row" className="px-1 py-1 text-left font-medium whitespace-nowrap text-text-secondary tabular-nums">
                  {`Set ${n}`}
                </th>
                <td className="px-1 py-1">
                  <RowTextField
                    className="w-20"
                    label={`Set ${n} reps`}
                    value={set.reps}
                    format={formatRange}
                    parse={parseRange}
                    problem={RANGE_PROBLEM}
                    suffix={repsSuffix || undefined}
                    onCommit={reps => changeSet(index, { ...set, reps })}
                  />
                </td>
                <td className="px-1 py-1">
                  <RowTextField
                    className="w-16"
                    label={`Set ${n} RIR`}
                    value={set.rir}
                    format={formatRange}
                    parse={parseRange}
                    problem={RANGE_PROBLEM}
                    onCommit={rir => changeSet(index, { ...set, rir })}
                  />
                </td>
                <td className="px-1 py-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove set ${n}`}
                    disabled={sets.length === 1}
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
          <Button variant="ghost" size="xs" disabled={sets.length < 2} onClick={() => changeSets(sets.map(() => copyOf(sets[0])))}>
            <Copy aria-hidden="true" />
            Apply set 1 to all
          </Button>
          <Button variant="ghost" size="xs" onClick={() => changeSets([...sets, copyOf(sets[sets.length - 1])])}>
            <Plus aria-hidden="true" />
            Add set
          </Button>
        </div>
      </div>
    </div>
  );
}
