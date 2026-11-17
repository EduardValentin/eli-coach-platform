import type { ReactNode } from 'react';
import { formatRest, LAST_SET_TECHNIQUE_LABELS, setsBreakdown, type Row } from '../../domain/program';
import { counted } from '../../utils/counted';
import { RirValue } from './RirValue';

export type Target = { term: string; value: ReactNode };

export type RowPlace = 'alone' | 'in-superset';

const NO_SETS: Target = { term: 'Sets', value: 'None yet' };

function restOf(row: Row): Target {
  return { term: 'Rest', value: formatRest(row.restSeconds) };
}

export function rowTargets(row: Row, repsSuffix: string): Target[] {
  const { warmUp, working, reps, rir } = setsBreakdown(row.sets, repsSuffix);
  if (warmUp + working === 0) return [NO_SETS];
  return [
    ...(warmUp > 0 ? [{ term: 'Warm-up', value: counted(warmUp, 'set') }] : []),
    ...(working > 0 ? [{ term: 'Working', value: reps ? `${counted(working, 'set')} × ${reps}` : `${counted(working, 'set')}, varied` }] : []),
    ...(rir ? [{ term: 'RIR', value: <RirValue rir={rir} /> }] : []),
    restOf(row),
  ];
}

export function rowRestAndTechnique(row: Row, place: RowPlace): Target[] {
  if (row.sets.length === 0) return [NO_SETS];
  return [
    ...(place === 'in-superset' ? [] : [restOf(row)]),
    ...(row.tempo ? [{ term: 'Tempo', value: row.tempo }] : []),
    ...(row.lastSetTechnique === 'none' ? [] : [{ term: 'Last set', value: LAST_SET_TECHNIQUE_LABELS[row.lastSetTechnique] }]),
  ];
}
