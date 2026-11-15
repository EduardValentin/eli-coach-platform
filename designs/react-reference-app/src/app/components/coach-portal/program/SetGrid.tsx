import type { ReactNode } from 'react';
import { Copy, Plus, X } from 'lucide-react';
import { formatRange, isWorkingSet, NEW_SET_RIR, withField, withSetAdded, workingSets, type Range, type Row, type SetSpec, type WorkingSet } from '../../../domain/program';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { RowTextField, useRowTextField } from './RowTextField';
import { formatRest, parseRange, parseRest, RANGE_PROBLEM, REST_PROBLEM } from './rowFields';
import { Checkbox } from '../../ui/checkbox';

type SetGridProps = { row: Row; exerciseName: string; repsSuffix: string; onChange: (row: Row) => void };
type SetKind = SetSpec['kind'];

const WIDE_COLUMNS = '@min-[34rem]:grid-cols-[1.5rem_5rem_4rem_4rem_7.5rem_2.5rem]';
const WIDE_COLUMNS_WITH_REPS_SUFFIX = '@min-[34rem]:grid-cols-[1.5rem_5rem_6.5rem_4rem_7.5rem_2.5rem]';
const MINI_LABEL_CLASS = cn(LABEL_CLASS, '@min-[34rem]:hidden');
const FIELD_WIDTH = 'w-full @min-[34rem]:w-16';
const WEIGHT_WIDTH = 'w-full @min-[34rem]:w-20';
const WEIGHT_PROBLEM = 'Use a weight in kg, or leave it empty';

function wideColumns(repsSuffix: string): string {
  return repsSuffix ? WIDE_COLUMNS_WITH_REPS_SUFFIX : WIDE_COLUMNS;
}

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

function SetCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <span aria-hidden="true" className={MINI_LABEL_CLASS}>
        {label}
      </span>
      {children}
    </div>
  );
}

function NoRir({ label }: { label: string }) {
  return (
    <span className="flex h-(--size-control-md) items-center px-2 text-sm text-text-secondary">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{`${label} RIR: none on a warm-up set`}</span>
    </span>
  );
}

type SetRowProps = {
  set: SetSpec;
  index: number;
  repsSuffix: string;
  removable: boolean;
  rirForNewWorking: Range;
  onChange: (set: SetSpec) => void;
  onRemove: () => void;
};

function SetRow({ set, index, repsSuffix, removable, rirForNewWorking, onChange, onRemove }: SetRowProps) {
  const label = `Set ${index + 1}`;
  const working = isWorkingSet(set);
  const reps = useRowTextField({
    className: FIELD_WIDTH,
    label: `${label} reps`,
    value: set.reps,
    format: formatRange,
    parse: parseRange,
    problem: RANGE_PROBLEM,
    suffix: repsSuffix || undefined,
    onCommit: next => onChange({ ...set, reps: next }),
  });
  const rir = useRowTextField({
    className: FIELD_WIDTH,
    label: `${label} RIR`,
    value: working ? set.rir : rirForNewWorking,
    format: formatRange,
    parse: parseRange,
    problem: RANGE_PROBLEM,
    onCommit: next => working && onChange({ ...set, rir: next }),
  });
  const weight = useRowTextField({
    className: WEIGHT_WIDTH,
    type: 'number',
    label: `${label} weight`,
    placeholder: 'by RIR',
    value: set.weightKg,
    format: formatWeight,
    parse: parseWeight,
    problem: WEIGHT_PROBLEM,
    suffix: 'kg',
    onCommit: next => onChange(withWeight(set, next)),
  });
  const rirProblem = working ? rir.problem : null;
  const hasProblem = Boolean(reps.problem ?? rirProblem ?? weight.problem);

  return (
    <li className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-4 py-2 @min-[34rem]:gap-y-2', wideColumns(repsSuffix))}>
      <span className="text-sm font-medium text-text-secondary tabular-nums @min-[34rem]:flex @min-[34rem]:h-(--size-control-md) @min-[34rem]:items-center">
        <span className="@min-[34rem]:sr-only">Set </span>
        {index + 1}
      </span>
      <label className="flex h-(--size-control-md) cursor-pointer items-center gap-3 text-sm text-text-primary @min-[34rem]:justify-center">
        <Checkbox
          aria-label={`${label} is a warm-up set`}
          checked={!working}
          onCheckedChange={checked => onChange(asKind(set, checked === true ? 'warm-up' : 'working', rirForNewWorking))}
        />
        <span aria-hidden="true" className="@min-[34rem]:hidden">
          Warm-up
        </span>
      </label>
      <div className="col-span-full grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2 @min-[18rem]:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1.7fr)_auto] @min-[34rem]:contents">
        <SetCell label="Reps">{reps.field}</SetCell>
        <SetCell label="RIR">{working ? rir.field : <NoRir label={label} />}</SetCell>
        <SetCell label="Weight">{weight.field}</SetCell>
        <Button variant="ghost" size="icon-xs" className="ml-2 justify-self-end" aria-label={`Remove ${label.toLowerCase()}`} disabled={!removable} onClick={onRemove}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {hasProblem && (
        <div className="col-span-full flex flex-wrap gap-x-4 gap-y-1">
          {reps.problem}
          {rirProblem}
          {weight.problem}
        </div>
      )}
    </li>
  );
}

export function SetGrid({ row, exerciseName, repsSuffix, onChange }: SetGridProps) {
  const { sets } = row;
  const changeSets = (next: SetSpec[]) => onChange(withField(row, 'sets', next));
  const changeSet = (index: number, set: SetSpec) => changeSets(sets.map((other, at) => (at === index ? set : other)));
  const working = workingSets(sets);
  const [firstWorking] = working;
  const warmUpCount = sets.length - working.length;
  const rirForNewWorking = firstWorking?.rir ?? NEW_SET_RIR;

  return (
    <div className="@container grid grid-cols-[minmax(0,1fr)] gap-3">
      <div>
        <div aria-hidden="true" className={cn('hidden gap-x-2 pb-1 @min-[34rem]:grid', wideColumns(repsSuffix), LABEL_CLASS)}>
          <span>Set</span>
          <span className="text-center">Warm-up</span>
          <span>Reps</span>
          <span>RIR</span>
          <span>Weight</span>
        </div>
        <ol aria-label={`Sets for ${exerciseName}`} className="grid grid-cols-[minmax(0,1fr)] divide-y divide-border-subtle @min-[34rem]:divide-y-0">
          {sets.map((set, index) => (
            <SetRow
              key={index}
              set={set}
              index={index}
              repsSuffix={repsSuffix}
              removable={!(isWorkingSet(set) && working.length === 1)}
              rirForNewWorking={rirForNewWorking}
              onChange={next => changeSet(index, next)}
              onRemove={() => changeSets(sets.filter((_, at) => at !== index))}
            />
          ))}
        </ol>
      </div>
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-3 @min-[34rem]:grid @min-[34rem]:gap-x-2', wideColumns(repsSuffix))}>
        <span aria-hidden="true" className={cn(LABEL_CLASS, 'flex h-(--size-control-md) items-center @min-[34rem]:col-span-2')}>
          Rest between sets
        </span>
        <div className="@min-[34rem]:col-span-3">
          <RowTextField
            className="w-20"
            label="Rest between sets"
            value={row.restSeconds}
            format={formatRest}
            parse={parseRest}
            problem={REST_PROBLEM}
            onCommit={seconds => onChange(withField(row, 'restSeconds', seconds))}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-6">
        <Button variant="ghost" size="xs" onClick={() => changeSets(withSetAdded(sets))}>
          <Plus aria-hidden="true" />
          Add set
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
      {warmUpCount > 0 && working.length === 0 && <p className="text-xs text-warning">Add at least one working set.</p>}
    </div>
  );
}
