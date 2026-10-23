import { Copy, Plus, X } from 'lucide-react';
import { formatRange, isWorkingSet, withField, workingSets, type Range, type Row, type SetSpec, type WorkingSet } from '../../../domain/program';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { RowTextField } from './RowTextField';
import { formatRest, parseRange, parseRest, RANGE_PROBLEM, REST_PROBLEM } from './rowFields';
import { SegmentedChoice } from './SegmentedChoice';

type SetGridProps = { row: Row; exerciseName: string; repsSuffix: string; onChange: (row: Row) => void };
type SetKind = SetSpec['kind'];

const HEAD_CLASS = 'px-1 pb-1 text-left font-normal';
const CELL_CLASS = 'px-1 py-1';
const KIND_OPTIONS: { value: SetKind; label: string }[] = [
  { value: 'warm-up', label: 'Warm-up' },
  { value: 'working', label: 'Working' },
];
const WEIGHT_PROBLEM = 'Use a weight in kg, or leave it empty';
const WARM_UP_REPS: Range = { min: 8, max: 8 };
const FALLBACK_RIR: Range = { min: 2, max: 2 };

function parseWeight(text: string): number | undefined | null {
  const trimmed = text.trim();
  if (trimmed === '') return undefined;
  const weight = Number(trimmed);
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function formatWeight(weight: number | undefined): string {
  return weight === undefined ? '' : String(weight);
}

function withWeight<Set extends SetSpec>(set: Set, weightKg: number | undefined): Set {
  if (weightKg !== undefined) return { ...set, weightKg };
  return Object.fromEntries(Object.entries(set).filter(([key]) => key !== 'weightKg')) as Set;
}

function asKind(set: SetSpec, kind: SetKind, rir: Range): SetSpec {
  if (kind === set.kind) return set;
  if (kind === 'working') return withWeight<SetSpec>({ kind, reps: set.reps, rir: { ...rir } }, set.weightKg);
  return withWeight<SetSpec>({ kind, reps: set.reps }, set.weightKg);
}

function likeFirst(set: SetSpec, first: WorkingSet): SetSpec {
  if (!isWorkingSet(set)) return set;
  return withWeight({ ...set, reps: { ...first.reps }, rir: { ...first.rir } }, first.weightKg);
}

export function SetGrid({ row, exerciseName, repsSuffix, onChange }: SetGridProps) {
  const { sets } = row;
  const changeSets = (next: SetSpec[]) => onChange(withField(row, 'sets', next));
  const changeSet = (index: number, set: SetSpec) => changeSets(sets.map((other, at) => (at === index ? set : other)));
  const working = workingSets(sets);
  const [firstWorking] = working;
  const lastWorking = working.at(-1);
  const warmUpCount = sets.length - working.length;
  const rirForNewWorking = firstWorking?.rir ?? FALLBACK_RIR;

  function addWarmUp() {
    const firstWorkingIndex = sets.findIndex(isWorkingSet);
    const at = firstWorkingIndex < 0 ? sets.length : firstWorkingIndex;
    changeSets([...sets.slice(0, at), { kind: 'warm-up', reps: { ...WARM_UP_REPS } }, ...sets.slice(at)]);
  }

  function addWorking() {
    const next: SetSpec = lastWorking ? structuredClone(lastWorking) : { kind: 'working', reps: { ...WARM_UP_REPS }, rir: { ...FALLBACK_RIR } };
    changeSets([...sets, next]);
  }

  return (
    <div className="grid gap-3">
      <div className="relative -mx-1 overflow-x-auto">
        <table className="w-full min-w-[30rem] max-w-2xl text-sm">
          <caption className="sr-only">{`Sets for ${exerciseName}`}</caption>
          <thead>
            <tr className={LABEL_CLASS}>
              <th scope="col" className={HEAD_CLASS}>
                Set
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Kind
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Reps
              </th>
              <th scope="col" className={HEAD_CLASS}>
                RIR
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Weight
              </th>
              <th scope="col" className={HEAD_CLASS}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set, index) => {
              const label = `Set ${index + 1}`;
              return (
                <tr key={index}>
                  <th scope="row" className="w-8 px-1 py-1 text-left font-medium text-text-secondary tabular-nums">
                    {index + 1}
                  </th>
                  <td className={cn(CELL_CLASS, 'w-40')}>
                    <SegmentedChoice
                      legend={`${label} kind`}
                      options={KIND_OPTIONS}
                      value={set.kind}
                      onChange={kind => changeSet(index, asKind(set, kind, rirForNewWorking))}
                    />
                  </td>
                  <td className={CELL_CLASS}>
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
                  <td className={CELL_CLASS}>
                    {isWorkingSet(set) ? (
                      <RowTextField
                        className="w-16"
                        label={`${label} RIR`}
                        value={set.rir}
                        format={formatRange}
                        parse={parseRange}
                        problem={RANGE_PROBLEM}
                        onCommit={rir => changeSet(index, { ...set, rir })}
                      />
                    ) : (
                      <Input size="sm" aria-label={`${label} RIR`} className="w-16" value="" disabled readOnly />
                    )}
                  </td>
                  <td className={CELL_CLASS}>
                    <RowTextField
                      className="w-20"
                      type="number"
                      label={`${label} weight`}
                      placeholder="by RIR"
                      value={set.weightKg}
                      format={formatWeight}
                      parse={parseWeight}
                      problem={WEIGHT_PROBLEM}
                      suffix="kg"
                      onCommit={weightKg => changeSet(index, withWeight(set, weightKg))}
                    />
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
      </div>
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
          <Button variant="ghost" size="xs" onClick={addWarmUp}>
            <Plus aria-hidden="true" />
            Add warm-up set
          </Button>
          <Button variant="ghost" size="xs" onClick={addWorking}>
            <Plus aria-hidden="true" />
            Add working set
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={working.length < 2}
            onClick={() => firstWorking && changeSets(sets.map(set => likeFirst(set, firstWorking)))}
          >
            <Copy aria-hidden="true" />
            Apply to all working sets
          </Button>
        </div>
      </div>
      {warmUpCount > 0 && working.length === 0 && <p className="text-xs text-warning">Add at least one working set.</p>}
    </div>
  );
}
