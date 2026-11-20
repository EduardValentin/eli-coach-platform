import { describe, expect, it } from 'vitest';
import { exercise, row as fixtureRow, session, startSets } from '../../test/programFixtures';
import type { Block, LevelHint, Range, Row, SetTargets, WorkingTargets } from './program';
import {
  firstLoadingWeek,
  hasDifferentWorkingSets,
  isCalibrationWeek,
  isOnlyWorkingSet,
  isProgressing,
  resolvedWeek,
  resolvedWeeks,
  rowAtWeek,
  sessionsCopiedFromFirstWeek,
  withoutTypedTarget,
  withoutWeekChanges,
  withSetAdded,
  withSetRemoved,
  withSetSwitched,
  withTypedTargets,
  withWeekReset,
  withWorkingSetsMatched,
  workingSetRuns,
  workingSetsOf,
  type ProgressionContext,
  type ResolvedWeek,
} from './programProgression';

const squat = exercise('squat', { equipment: ['Barbell', 'Squat rack'], role: 'main-compound', pattern: 'squat' });
const curl = exercise('curl', { equipment: ['Dumbbells'], role: 'isolation', pattern: 'isolation' });
const plank = exercise('plank', { measuredIn: 'time', role: 'isolation', pattern: 'core' });
const pushUp = exercise('pushUp', { role: 'secondary-compound', pattern: 'horizontal-push' });
const sledPush = exercise('sled', { measuredIn: 'distance', equipment: ['Machine'] });

const SET_1 = 'set-1';
const WARM_UPS: SetTargets[] = [
  { reps: { min: 8, max: 8 }, rir: 3, weightKg: 20 },
  { reps: { min: 5, max: 5 }, rir: 3, weightKg: 40 },
];

type RirStart = Pick<WorkingTargets, 'rir' | 'lastSetRir'>;
const LOADING_RIR: RirStart = { rir: 3, lastSetRir: 2 };

function targets(count: number, reps: Range, rir: RirStart, weightKg?: number): Partial<WorkingTargets> {
  return { count, reps, ...rir, ...(weightKg === undefined ? {} : { weightKg }) };
}

function squatRow(weightKg?: number, overrides: Partial<Row> = {}): Row {
  return fixtureRow({ exerciseId: 'squat', slot: 'A', startSets: startSets(targets(4, { min: 6, max: 8 }, LOADING_RIR, weightKg)), ...overrides });
}

function curlRow(weightKg: number): Row {
  return fixtureRow({ exerciseId: 'curl', slot: 'C', startSets: startSets(targets(3, { min: 10, max: 15 }, LOADING_RIR, weightKg)) });
}

type ContextShape = { level: LevelHint; exercise?: ProgressionContext['exercise']; block?: Partial<Pick<Block, 'type' | 'weeks' | 'calibrationWeek'>> };

function context({ level, exercise: chosen, block }: ContextShape): ProgressionContext {
  return { level, exercise: chosen, block: { type: 'hypertrophy', weeks: 6, calibrationWeek: false, ...block } };
}

const intermediate = context({ level: 'intermediate', exercise: squat });

/** The note a week shows: the first one any of its sets carries. */
function noteOf(week: ResolvedWeek) {
  return week.sets.find(set => set.note)?.note;
}

function setTable(weeks: ResolvedWeek[], index = 0): [number | undefined, number, number][] {
  return weeks.map(week => {
    const set = workingSetsOf(week)[index];
    return [set.weightKg.value, set.reps.value.min, set.rir.value];
  });
}

function workingCounts(weeks: ResolvedWeek[]): number[] {
  return weeks.map(week => workingSetsOf(week).length);
}

function kindsOf(week: ResolvedWeek): string[] {
  return week.sets.map(set => `${set.kind}:${set.setId}`);
}

type At = { week: number; setId?: string };

function typed(row: Row, { week, setId = SET_1 }: At, value: Parameters<typeof withTypedTargets>[2]): Row {
  return withTypedTargets(row, { week, setId }, value);
}

describe('resolvedWeeks worked examples (6-week Hypertrophy block)', () => {
  it.each([
    ['beginner', 40, [[40, 6, 3], [40, 7, 3], [40, 8, 3], [40, 8, 3], [40, 8, 3], [45, 6, 3]], [[40, 6, 2], [40, 7, 2], [40, 8, 2], [40, 8, 2], [40, 8, 2], [45, 6, 2]]],
    ['intermediate', 70, [[70, 6, 3], [70, 6, 3], [70, 7, 3], [70, 8, 2], [75, 6, 2], [75, 7, 1]], [[70, 6, 2], [70, 6, 2], [70, 7, 2], [70, 8, 2], [75, 6, 2], [75, 7, 1]]],
    ['advanced', 100, [[100, 6, 3], [100, 6, 3], [100, 6, 3], [100, 8, 2], [100, 8, 2], [105, 7, 1]], [[100, 6, 2], [100, 6, 2], [100, 6, 2], [100, 8, 2], [100, 8, 2], [105, 7, 1]]],
  ] as const)('progresses a %s back squat from %s kg, every set at the first set’s reps and weight and its own RIR', (level, weightKg, firstSets, lastSet) => {
    // act
    const weeks = resolvedWeeks(squatRow(weightKg), context({ level, exercise: squat }));

    // assert
    expect(setTable(weeks)).toEqual(firstSets);
    expect(setTable(weeks, 2)).toEqual(firstSets);
    expect(setTable(weeks, 3)).toEqual(lastSet);
    expect(workingCounts(weeks)).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it.each([
    ['beginner', 6, [[6, 10, 3], [6, 11, 3], [6, 12, 3], [6, 13, 3], [6, 14, 3], [6, 15, 3]], [[6, 10, 2], [6, 11, 2], [6, 12, 2], [6, 13, 2], [6, 14, 2], [6, 15, 2]]],
    ['intermediate', 10, [[10, 10, 3], [10, 10, 3], [10, 11, 3], [10, 12, 2], [10, 13, 2], [10, 14, 1]], [[10, 10, 2], [10, 10, 2], [10, 11, 2], [10, 12, 2], [10, 13, 2], [10, 14, 1]]],
    ['advanced', 14, [[14, 10, 3], [14, 10, 3], [14, 10, 3], [14, 12, 2], [14, 12, 2], [14, 13, 1]], [[14, 10, 2], [14, 10, 2], [14, 10, 2], [14, 12, 2], [14, 12, 2], [14, 13, 1]]],
  ] as const)('progresses a %s dumbbell curl from %s kg, every set at the first set’s reps and weight and its own RIR', (level, weightKg, firstSets, lastSet) => {
    // act
    const weeks = resolvedWeeks(curlRow(weightKg), context({ level, exercise: curl }));

    // assert
    expect(setTable(weeks)).toEqual(firstSets);
    expect(setTable(weeks, 2)).toEqual(lastSet);
  });

  it('shows reps as the range from this week up to the top and one RIR per set', () => {
    // act
    const sets = workingSetsOf(resolvedWeek(squatRow(70), 6, intermediate));

    // assert
    expect(sets[0].reps.value).toEqual({ min: 7, max: 8 });
    expect(sets.map(set => set.rir.value)).toEqual([1, 1, 1, 1]);
  });

  it('holds the load at the top of the range with a note when the next barbell load is too heavy', () => {
    // act
    const weeks = resolvedWeeks(squatRow(40), context({ level: 'beginner', exercise: squat }));

    // assert
    expect(weeks.map(noteOf)).toEqual([undefined, undefined, undefined, 'step-too-large', 'step-too-large', undefined]);
    expect(workingSetsOf(weeks[3])[0].reps.value).toEqual({ min: 8, max: 8 });
  });
});

describe('resolvedWeeks first week and sources', () => {
  it('starts the first week from the block defaults, all suggested until the coach types', () => {
    // act
    const [week] = resolvedWeeks(squatRow(70), intermediate);

    // assert
    expect(week.changed).toBe(false);
    expect(workingSetsOf(week)[0]).toEqual({
      setId: SET_1,
      kind: 'working',
      added: false,
      reps: { value: { min: 6, max: 8 }, source: 'suggested' },
      rir: { value: 3, source: 'suggested' },
      weightKg: { value: 70, source: 'suggested' },
    });
  });

  it('marks only the first-week values the coach typed and suggests the later weeks from them', () => {
    // arrange
    const row = typed(squatRow(), { week: 1 }, { weightKg: 70 });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(workingSetsOf(weeks[0])[0].weightKg).toEqual({ value: 70, source: 'typed' });
    expect(workingSetsOf(weeks[0])[0].reps.source).toBe('suggested');
    expect(weeks[0].changed).toBe(true);
    expect(setTable(weeks)).toEqual(setTable(resolvedWeeks(squatRow(70), intermediate)));
    expect(workingSetsOf(weeks[4])[0].weightKg).toEqual({ value: 75, source: 'suggested' });
    expect(weeks[4].changed).toBe(false);
  });

  it('takes a reps range typed in the first week as the range later weeks progress in', () => {
    // arrange
    const row = typed(squatRow(70), { week: 1 }, { reps: { min: 8, max: 10 } });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].reps.value.max)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(workingSetsOf(weeks[0])[0].reps).toEqual({ value: { min: 8, max: 10 }, source: 'typed' });
  });

  it('progresses each set of the first week on its own', () => {
    // arrange
    const row = typed(squatRow(70), { week: 1 }, { reps: { min: 5, max: 5 }, weightKg: 85 });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].reps.value)).toEqual(weeks.map(() => ({ min: 5, max: 5 })));
    expect(workingSetsOf(weeks[5])[0].weightKg.value).toBeGreaterThan(85);
    expect(setTable(weeks, 1)).toEqual(setTable(resolvedWeeks(squatRow(70), intermediate)));
    expect(hasDifferentWorkingSets(weeks[2])).toBe(true);
  });
});

describe('resolvedWeeks RIR taper', () => {
  it('keeps RIR flat in a Foundation block', () => {
    // act
    const weeks = resolvedWeeks(squatRow(70), context({ level: 'advanced', exercise: squat, block: { type: 'foundation' } }));

    // assert
    expect(weeks.map(week => workingSetsOf(week).map(set => set.rir.value))).toEqual(weeks.map(() => [3, 3, 3, 2]));
  });

  it('tapers a Strength block toward RIR 2', () => {
    // act
    const weeks = resolvedWeeks(squatRow(70), context({ level: 'intermediate', exercise: squat, block: { type: 'strength', weeks: 4 } }));

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].rir.value)).toEqual([3, 3, 3, 2]);
    expect(weeks.map(week => workingSetsOf(week)[3].rir.value)).toEqual([2, 2, 2, 2]);
  });

  it('keeps RIR flat when the first week already sits at the floor', () => {
    // arrange
    const row = fixtureRow({ exerciseId: 'squat', startSets: startSets(targets(1, { min: 6, max: 8 }, { rir: 1 }, 70)) });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].rir.value)).toEqual([1, 1, 1, 1, 1, 1]);
  });
});

describe('resolvedWeeks short blocks', () => {
  it('returns the first week only for a one-week block', () => {
    // act
    const weeks = resolvedWeeks(squatRow(70), context({ level: 'intermediate', exercise: squat, block: { weeks: 1 } }));

    // assert
    expect(setTable(weeks)).toEqual([[70, 6, 3]]);
  });

  it('gives a two-week block one week of capacity gain and no RIR taper', () => {
    // act
    const weeks = resolvedWeeks(squatRow(100), context({ level: 'beginner', exercise: squat, block: { weeks: 2 } }));

    // assert
    expect(setTable(weeks)).toEqual([
      [100, 6, 3],
      [100, 7, 3],
    ]);
  });

  it('keeps RIR flat in a two-week block for an advanced client', () => {
    // act
    const weeks = resolvedWeeks(squatRow(100), context({ level: 'advanced', exercise: squat, block: { weeks: 2 } }));

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].rir.value)).toEqual([3, 3]);
  });
});

describe('resolvedWeeks without a load to step', () => {
  it('progresses reps and RIR when there is no starting weight', () => {
    // act
    const weeks = resolvedWeeks(squatRow(undefined), intermediate);

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 6, 3],
      [undefined, 6, 3],
      [undefined, 7, 3],
      [undefined, 8, 2],
      [undefined, 8, 2],
      [undefined, 8, 1],
    ]);
  });

  it('adds five seconds a week to a timed row, holds RIR and notes the hold at the top', () => {
    // arrange
    const row = fixtureRow({ exerciseId: 'plank', startSets: startSets(targets(2, { min: 30, max: 45 }, { rir: 3 })) });

    // act
    const weeks = resolvedWeeks(row, context({ level: 'intermediate', exercise: plank }));

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 30, 3],
      [undefined, 35, 3],
      [undefined, 40, 3],
      [undefined, 45, 3],
      [undefined, 45, 3],
      [undefined, 45, 3],
    ]);
    expect(weeks.map(noteOf)).toEqual([undefined, undefined, undefined, undefined, 'progress-the-variation', 'progress-the-variation']);
  });

  it('adds five seconds every second week for an advanced client', () => {
    // arrange
    const row = fixtureRow({ exerciseId: 'plank', startSets: startSets(targets(1, { min: 30, max: 60 }, { rir: 3 })) });

    // act
    const weeks = resolvedWeeks(row, context({ level: 'advanced', exercise: plank }));

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].reps.value.min)).toEqual([30, 30, 35, 35, 40, 40]);
  });

  it('progresses only reps on a bodyweight row and asks for a harder variation at the top', () => {
    // arrange
    const row = fixtureRow({ exerciseId: 'pushUp', slot: 'B', startSets: startSets(targets(3, { min: 8, max: 12 }, { rir: 3 })) });

    // act
    const weeks = resolvedWeeks(row, context({ level: 'beginner', exercise: pushUp }));

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].reps.value.min)).toEqual([8, 9, 10, 11, 12, 12]);
    expect(noteOf(weeks[5])).toBe('harder-variation-or-add-load');
    expect(weeks.every(week => workingSetsOf(week)[0].weightKg.value === undefined)).toBe(true);
  });

  it.each([
    ['a custom progression rule', squatRow(70, { progression: { kind: 'custom', text: 'Add a rep when it feels easy' } }), squat, 'hypertrophy'],
    ['a distance row', fixtureRow({ exerciseId: 'sled', startSets: startSets(targets(2, { min: 20, max: 20 }, { rir: 3 }, 70)) }), sledPush, 'hypertrophy'],
    ['a Deload block', squatRow(70), squat, 'deload'],
  ] as const)('repeats the first week every week for %s', (_, row, chosen, type) => {
    // act
    const shape = context({ level: 'intermediate', exercise: chosen, block: { type } });
    const weeks = resolvedWeeks(row, shape);

    // assert
    const sets = weeks.map(week => rowAtWeek(row, week.week, shape).sets);
    expect(sets).toEqual(weeks.map(() => sets[0]));
    expect(weeks.every(week => noteOf(week) === undefined)).toBe(true);
  });
});

describe('a change in a later week stays in that week', () => {
  it('keeps a weight typed in week 3 to week 3 and leaves every other week as suggested', () => {
    // arrange
    const plain = resolvedWeeks(squatRow(70), intermediate);

    // act
    const weeks = resolvedWeeks(typed(squatRow(70), { week: 3 }, { weightKg: 80 }), intermediate);

    // assert
    expect(workingSetsOf(weeks[2])[0].weightKg).toEqual({ value: 80, source: 'typed' });
    expect(workingSetsOf(weeks[2])[0].reps).toEqual(workingSetsOf(plain[2])[0].reps);
    expect(setTable(weeks).filter((_, index) => index !== 2)).toEqual(setTable(plain).filter((_, index) => index !== 2));
    expect(setTable(weeks, 1)).toEqual(setTable(plain, 1));
    expect(weeks.map(week => week.changed)).toEqual([false, false, true, false, false, false]);
  });

  it('starts no weight suggestions from a weight typed in a later week', () => {
    // act
    const weeks = resolvedWeeks(typed(squatRow(undefined), { week: 3 }, { weightKg: 70 }), intermediate);

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].weightKg.value)).toEqual([undefined, undefined, 70, undefined, undefined, undefined]);
  });

  it('lets a first-week change flow into the values a later week left alone, and keeps what that week typed', () => {
    // arrange
    const row = typed(squatRow(70), { week: 5 }, { reps: { min: 6, max: 6 } });

    // act
    const weeks = resolvedWeeks(typed(row, { week: 1 }, { weightKg: 100 }), intermediate);

    // assert
    expect(workingSetsOf(weeks[4])[0].reps).toEqual({ value: { min: 6, max: 6 }, source: 'typed' });
    expect(workingSetsOf(weeks[4])[0].weightKg).toEqual({ value: workingSetsOf(resolvedWeek(squatRow(100), 5, intermediate))[0].weightKg.value, source: 'suggested' });
    expect(workingSetsOf(weeks[4])[0].weightKg.value).toBeGreaterThanOrEqual(100);
  });

  it('repeats the first week under a custom rule and keeps a value typed later to its own week', () => {
    // arrange
    const custom = squatRow(70, { progression: { kind: 'custom', text: 'Coach decides' } });

    // act
    const weeks = resolvedWeeks(typed(custom, { week: 3 }, { weightKg: 80, reps: { min: 5, max: 5 } }), intermediate);

    // assert
    expect(weeks.map(week => workingSetsOf(week)[0].weightKg.value)).toEqual([70, 70, 80, 70, 70, 70]);
    expect(workingSetsOf(weeks[3])[0].reps.value).toEqual({ min: 6, max: 8 });
  });

  it('drops the progression note of a set whose reps or weight the coach typed that week', () => {
    // arrange
    const row = typed(squatRow(40), { week: 4 }, { weightKg: 42.5 });

    // act
    const week = resolvedWeek(row, 4, context({ level: 'beginner', exercise: squat }));

    // assert
    expect(workingSetsOf(week)[0].note).toBeUndefined();
    expect(workingSetsOf(week)[1].note).toBe('step-too-large');
    expect(noteOf(week)).toBe('step-too-large');
  });
});

describe('working sets of one kind progress together', () => {
  const repsAndWeight = (week: ResolvedWeek) => workingSetsOf(week).map(set => [set.reps.value.min, set.weightKg.value]);
  const rirs = (week: ResolvedWeek) => workingSetsOf(week).map(set => set.rir.value);

  it.each([
    ['intermediate', 'hypertrophy'],
    ['advanced', 'hypertrophy'],
    ['intermediate', 'strength'],
    ['advanced', 'strength'],
  ] as const)('keeps a default %s %s exercise on one kind of set every week', (level, type) => {
    // act
    const weeks = resolvedWeeks(squatRow(70), context({ level, exercise: squat, block: { type } }));

    // assert
    expect(weeks.every(week => !hasDifferentWorkingSets(week))).toBe(true);
    expect(weeks.every(week => rirs(week)[3] <= rirs(week)[0])).toBe(true);
  });

  it('keeps later weeks of one kind when one set’s first-week RIR is typed', () => {
    // arrange
    const row = typed(squatRow(70), { week: 1, setId: 'set-3' }, { rir: 1 });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(weeks.every(week => !hasDifferentWorkingSets(week))).toBe(true);
    expect(weeks.map(week => rirs(week)[2])).toEqual([1, 1, 1, 1, 1, 1]);
    expect(weeks.map(repsAndWeight)).toEqual(resolvedWeeks(squatRow(70), intermediate).map(repsAndWeight));
  });

  it('moves the whole group when the first set’s first-week RIR is typed, since its chain leads the group', () => {
    // arrange
    const row = typed(squatRow(70), { week: 1 }, { rir: 1 });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(weeks.every(week => !hasDifferentWorkingSets(week))).toBe(true);
    expect(weeks.map(repsAndWeight)).not.toEqual(resolvedWeeks(squatRow(70), intermediate).map(repsAndWeight));
    expect(rirs(weeks[5])).toEqual([1, 1, 1, 1]);
  });

  it('keeps a value typed on one set in a later week to that set and week', () => {
    // arrange
    const row = typed(squatRow(70), { week: 4, setId: 'set-2' }, { reps: { min: 10, max: 10 } });

    // act
    const weeks = resolvedWeeks(row, intermediate);

    // assert
    expect(workingSetsOf(weeks[3])[1].reps).toEqual({ value: { min: 10, max: 10 }, source: 'typed' });
    expect(weeks.filter((_, index) => index !== 3).every(week => !hasDifferentWorkingSets(week))).toBe(true);
  });

  it('gives a set made a different kind in the first week its own chain, and takes it back once it matches again', () => {
    // arrange
    const heavier = typed(squatRow(70), { week: 1, setId: 'set-1' }, { weightKg: 80 });

    // act
    const split = resolvedWeeks(heavier, intermediate);
    const rejoined = resolvedWeeks(typed(heavier, { week: 1, setId: 'set-1' }, { weightKg: 70 }), intermediate);

    // assert
    expect(split.every(hasDifferentWorkingSets)).toBe(true);
    expect(split.map(week => repsAndWeight(week).slice(1))).toEqual(resolvedWeeks(squatRow(70), intermediate).map(week => repsAndWeight(week).slice(1)));
    expect(rejoined.map(repsAndWeight)).toEqual(resolvedWeeks(squatRow(70), intermediate).map(repsAndWeight));
  });

  it('regroups from the resolved first week when a first-week set is added or removed', () => {
    // arrange
    const withoutLeader = withSetRemoved(typed(squatRow(70), { week: 1, setId: 'set-1' }, { weightKg: 80 }), { week: 1, setId: 'set-1' });

    // act
    const removed = resolvedWeeks(withoutLeader, intermediate);
    const added = resolvedWeeks(withSetAdded(squatRow(70), 1, intermediate), intermediate);

    // assert
    expect(removed.every(week => !hasDifferentWorkingSets(week))).toBe(true);
    expect(workingCounts(removed)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(added.every(week => !hasDifferentWorkingSets(week))).toBe(true);
    expect(rirs(added[0])).toEqual([3, 3, 3, 2, 2]);
  });

  it('carries the group’s progression note to every set of the group', () => {
    // act
    const week = resolvedWeek(squatRow(40), 4, context({ level: 'beginner', exercise: squat }));

    // assert
    expect(workingSetsOf(week).map(set => set.note)).toEqual(['step-too-large', 'step-too-large', 'step-too-large', 'step-too-large']);
    expect(noteOf(week)).toBe('step-too-large');
  });
});

describe('the sets of a week', () => {
  it('lists the warm-up sets before the working sets as the client reads them', () => {
    // arrange
    const row = squatRow(70, { startSets: startSets(targets(2, { min: 6, max: 8 }, { rir: 3 }, 70), WARM_UPS.slice(0, 1)) });

    // act
    const { sets } = rowAtWeek(row, 2, intermediate);

    // assert
    expect(sets).toEqual([
      { kind: 'warm-up', reps: { min: 8, max: 8 }, weightKg: 20 },
      { kind: 'working', reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
      { kind: 'working', reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
    ]);
  });

  it('adds a working set to a later week only, as a copy of its last working set', () => {
    // arrange
    const row = typed(squatRow(70), { week: 4, setId: 'set-4' }, { weightKg: 65 });

    // act
    const weeks = resolvedWeeks(withSetAdded(row, 4, intermediate), intermediate);

    // assert
    expect(workingCounts(weeks)).toEqual([4, 4, 4, 5, 4, 4]);
    expect(workingSetsOf(weeks[3])[4]).toMatchObject({ added: true, reps: workingSetsOf(weeks[3])[3].reps, weightKg: { value: 65, source: 'typed' } });
    expect(weeks[3].changed).toBe(true);
  });

  it('adds a working set to the first week, and every later week follows with one more set', () => {
    // act
    const weeks = resolvedWeeks(withSetAdded(squatRow(70), 1, intermediate), intermediate);

    // assert
    expect(workingCounts(weeks)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(setTable(weeks, 4)).toEqual(setTable(weeks, 3));
    expect(workingSetsOf(weeks[0])[4].added).toBe(true);
    expect(workingSetsOf(weeks[3])[4].added).toBe(false);
  });

  it('removes a set from a later week only', () => {
    // act
    const weeks = resolvedWeeks(withSetRemoved(squatRow(70), { week: 2, setId: 'set-2' }), intermediate);

    // assert
    expect(workingCounts(weeks)).toEqual([4, 3, 4, 4, 4, 4]);
    expect(workingSetsOf(weeks[1]).map(set => set.setId)).toEqual(['set-1', 'set-3', 'set-4']);
  });

  it('removes a set from the first week and every later week, forgetting what was typed on it', () => {
    // arrange
    const row = typed(squatRow(70), { week: 4, setId: 'set-4' }, { weightKg: 90 });

    // act
    const removed = withSetRemoved(row, { week: 1, setId: 'set-4' });

    // assert
    expect(workingCounts(resolvedWeeks(removed, intermediate))).toEqual([3, 3, 3, 3, 3, 3]);
    expect(removed.weekChanges).toEqual({ 1: { removed: ['set-4'] } });
  });

  it('takes a set added in a week back out without leaving a trace', () => {
    // arrange
    const added = withSetAdded(squatRow(70), 3, intermediate);
    const addedId = added.weekChanges?.[3]?.added?.[0].id ?? '';

    // act
    const removed = withSetRemoved(added, { week: 3, setId: addedId });

    // assert
    expect(removed).not.toHaveProperty('weekChanges');
  });

  it('never takes away or switches the only working set of a week', () => {
    // arrange
    const row = fixtureRow({ startSets: startSets({ count: 1 }) });

    // act
    const removed = withSetRemoved(row, { week: 2, setId: SET_1 });
    const switched = withSetSwitched(row, { week: 2, setId: SET_1 });

    // assert
    expect(isOnlyWorkingSet(row, { week: 2, setId: SET_1 })).toBe(true);
    expect(removed).toBe(row);
    expect(switched).toBe(row);
  });

  it('switches a working set to the end of the warm-up sets and a warm-up set to the start of the working sets, in that week only', () => {
    // arrange
    const row = squatRow(70, { startSets: startSets(targets(3, { min: 6, max: 8 }, { rir: 3 }, 70), WARM_UPS) });

    // act
    const toWarmUp = withSetSwitched(row, { week: 3, setId: 'set-2' });
    const both = withSetSwitched(toWarmUp, { week: 3, setId: 'warm-up-1' });
    const weeks = resolvedWeeks(both, intermediate);

    // assert
    expect(kindsOf(weeks[2])).toEqual(['warm-up:warm-up-2', 'warm-up:set-2', 'working:warm-up-1', 'working:set-1', 'working:set-3']);
    expect(kindsOf(weeks[3])).toEqual(['warm-up:warm-up-1', 'warm-up:warm-up-2', 'working:set-1', 'working:set-2', 'working:set-3']);
    expect(rowAtWeek(both, 3, intermediate).sets[1]).toEqual({ kind: 'warm-up', reps: { min: 7, max: 8 }, weightKg: 70 });
  });

  it('switches a set back to where it was', () => {
    // arrange
    const row = squatRow(70, { startSets: startSets(targets(3, { min: 6, max: 8 }, { rir: 3 }, 70), WARM_UPS) });

    // act
    const back = withSetSwitched(withSetSwitched(row, { week: 3, setId: 'set-2' }), { week: 3, setId: 'set-2' });

    // assert
    expect(back).not.toHaveProperty('weekChanges');
  });

  it('carries a set switched in the first week into every later week, where it progresses as a working set', () => {
    // arrange
    const row = squatRow(70, { startSets: startSets(targets(3, { min: 6, max: 8 }, { rir: 3 }, 70), WARM_UPS) });

    // act
    const weeks = resolvedWeeks(withSetSwitched(row, { week: 1, setId: 'warm-up-2' }), intermediate);

    // assert
    expect(weeks.every(week => week.sets[1].setId === 'warm-up-2' && week.sets[1].kind === 'working')).toBe(true);
    expect(workingCounts(weeks)).toEqual([4, 4, 4, 4, 4, 4]);
    expect(weeks.map(week => week.sets[1].reps.value.min)).toEqual([5, 5, 5, 5, 5, 5]);
    expect(weeks.map(week => week.changed)).toEqual([true, false, false, false, false, false]);
  });

  it('reads working sets that differ only in RIR as the same kind of set', () => {
    // act
    const week = resolvedWeek(squatRow(70), 1, intermediate);

    // assert
    expect(workingSetsOf(week).map(set => set.rir.value)).toEqual([3, 3, 3, 2]);
    expect(hasDifferentWorkingSets(week)).toBe(false);
  });

  it('gives every working set of a week the first one’s reps and weight and leaves each set’s RIR', () => {
    // arrange
    const row = typed(typed(squatRow(70), { week: 3, setId: 'set-2' }, { reps: { min: 10, max: 10 } }), { week: 3, setId: 'set-1' }, { weightKg: 80 });

    // act
    const matched = withWorkingSetsMatched(row, 3, intermediate);
    const week = resolvedWeek(matched, 3, intermediate);

    // assert
    expect(hasDifferentWorkingSets(resolvedWeek(row, 3, intermediate))).toBe(true);
    expect(hasDifferentWorkingSets(week)).toBe(false);
    expect(workingSetsOf(week).map(set => set.weightKg)).toEqual(Array.from({ length: 4 }, () => ({ value: 80, source: 'typed' })));
    expect(workingSetsOf(week).map(set => set.rir)).toEqual([...Array.from({ length: 3 }, () => ({ value: 3, source: 'suggested' })), { value: 2, source: 'suggested' }]);
    expect(resolvedWeek(matched, 4, intermediate).changed).toBe(false);
  });

  it('keeps a typed value on its own set while other sets of the week are added, removed and switched', () => {
    // arrange
    const row = typed(squatRow(70), { week: 4, setId: 'set-3' }, { weightKg: 90 });

    // act
    const changed = withSetSwitched(withSetRemoved(withSetAdded(row, 4, intermediate), { week: 4, setId: 'set-1' }), { week: 4, setId: 'set-2' });
    const week = resolvedWeek(changed, 4, intermediate);

    // assert
    expect(week.sets.find(set => set.setId === 'set-3')?.weightKg).toEqual({ value: 90, source: 'typed' });
    expect(kindsOf(week).slice(0, 3)).toEqual(['warm-up:set-2', 'working:set-3', 'working:set-4']);
  });

  it('resolves only the weeks the block has, and finds a later week’s changes again when it grows back', () => {
    // arrange
    const row = typed(withSetAdded(squatRow(70), 6, intermediate), { week: 6 }, { weightKg: 90 });
    const shorter = context({ level: 'intermediate', exercise: squat, block: { weeks: 4 } });

    // act
    const short = resolvedWeeks(row, shorter);
    const full = resolvedWeeks(row, intermediate);

    // assert
    expect(workingCounts(short)).toEqual([4, 4, 4, 4]);
    expect(workingCounts(full)).toEqual([4, 4, 4, 4, 4, 5]);
    expect(workingSetsOf(full[5])[0].weightKg).toEqual({ value: 90, source: 'typed' });
  });
});

describe('workingSetRuns', () => {
  it('runs neighbouring sets of one kind together in the order they are performed, each run with its RIR span', () => {
    // arrange
    const row = typed(typed(squatRow(70), { week: 2, setId: 'set-2' }, { reps: { min: 5, max: 5 } }), { week: 2, setId: 'set-4' }, { rir: 1 });

    // act
    const runs = workingSetRuns(resolvedWeek(row, 2, intermediate));

    // assert
    expect(runs.map(run => [run.set.setId, run.count, run.rir])).toEqual([
      ['set-1', 1, { min: 3, max: 3 }],
      ['set-2', 1, { min: 3, max: 3 }],
      ['set-3', 2, { min: 1, max: 3 }],
    ]);
  });
});

describe('progression facts of a block', () => {
  it('tells the calibration week and the first loading week apart', () => {
    // arrange
    const calibrating = { calibrationWeek: true };
    const loading = { calibrationWeek: false };

    // act
    const facts = [isCalibrationWeek(calibrating, 1), isCalibrationWeek(calibrating, 2), isCalibrationWeek(loading, 1), firstLoadingWeek(calibrating), firstLoadingWeek(loading)];

    // assert
    expect(facts).toEqual([true, false, false, 2, 1]);
  });

  it('progresses a double-progression row and holds a custom rule, a Deload block and a distance row', () => {
    // act
    const answers = [
      isProgressing(squatRow(70), intermediate),
      isProgressing(squatRow(70, { progression: { kind: 'custom', text: '' } }), intermediate),
      isProgressing(squatRow(70), context({ level: 'intermediate', exercise: squat, block: { type: 'deload' } })),
      isProgressing(squatRow(70), context({ level: 'intermediate', exercise: sledPush })),
    ];

    // assert
    expect(answers).toEqual([true, false, false, false]);
  });
});

describe('resolvedWeeks calibration week', () => {
  const calibration = context({ level: 'intermediate', exercise: squat, block: { calibrationWeek: true } });

  it('leaves the first week without a weight and progresses from the weight typed in the second', () => {
    // arrange
    const row = typed(squatRow(undefined, { startSets: startSets(targets(4, { min: 6, max: 8 }, { rir: 3 }), WARM_UPS) }), { week: 2 }, { weightKg: 70 });

    // act
    const weeks = resolvedWeeks(row, calibration);

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 6, 3],
      [70, 6, 3],
      [70, 6, 3],
      [70, 8, 2],
      [70, 8, 2],
      [75, 7, 1],
    ]);
    expect(setTable(weeks, 1).map(([weight]) => weight)).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    expect(rowAtWeek(row, 1, calibration).sets.slice(0, 2)).toEqual([
      { kind: 'warm-up', reps: { min: 8, max: 8 } },
      { kind: 'warm-up', reps: { min: 5, max: 5 } },
    ]);
  });

  it('carries the sets, reps and RIR of the calibration week into the second week and keeps second-week reps there', () => {
    // arrange
    const withFifth = withSetAdded(typed(squatRow(70), { week: 1 }, { rir: 4, weightKg: 60 }), 1, calibration);
    const row = typed(withFifth, { week: 2 }, { reps: { min: 5, max: 5 } });

    // act
    const weeks = resolvedWeeks(row, calibration);

    // assert
    expect(workingSetsOf(weeks[0])[0]).toMatchObject({ rir: { value: 4, source: 'typed' }, weightKg: { value: undefined, source: 'suggested' } });
    expect(workingSetsOf(weeks[1])[0]).toMatchObject({ rir: { value: 4 }, weightKg: { value: 70 }, reps: { value: { min: 5, max: 5 }, source: 'typed' } });
    expect(workingSetsOf(weeks[2])[0].reps.source).toBe('suggested');
    expect(workingCounts(weeks)).toEqual([5, 5, 5, 5, 5, 5]);
  });
});

describe('resolvedWeeks warm-up weights', () => {
  const warmedUp = squatRow(70, { startSets: startSets(targets(2, { min: 6, max: 8 }, { rir: 3 }, 70), WARM_UPS) });

  it('scales warm-up weights with the week’s heaviest working set, rounded to the step', () => {
    // act
    const weeks = resolvedWeeks(warmedUp, intermediate);

    // assert
    expect(weeks[0].sets.slice(0, 2).map(set => set.weightKg.value)).toEqual([20, 40]);
    expect(weeks[4].sets.slice(0, 2).map(set => set.weightKg.value)).toEqual([20, 45]);
  });

  it('follows a heavier set typed in a later week in that week only', () => {
    // act
    const weeks = resolvedWeeks(typed(warmedUp, { week: 2, setId: 'set-2' }, { weightKg: 140 }), intermediate);

    // assert
    expect(weeks[1].sets.slice(0, 2).map(set => set.weightKg)).toEqual([
      { value: 40, source: 'suggested' },
      { value: 80, source: 'suggested' },
    ]);
    expect(weeks[2].sets.slice(0, 2).map(set => set.weightKg.value)).toEqual([20, 40]);
  });

  it('keeps a warm-up weight typed in a week as typed', () => {
    // act
    const week = resolvedWeek(typed(warmedUp, { week: 5, setId: 'warm-up-2' }, { weightKg: 50 }), 5, intermediate);

    // assert
    expect(week.sets[1].weightKg).toEqual({ value: 50, source: 'typed' });
  });
});

describe('week changes storage', () => {
  it('stores a typed value by week and set, and merges values typed for the same set', () => {
    // act
    const row = typed(typed(squatRow(70), { week: 4 }, { weightKg: 75 }), { week: 4 }, { reps: { min: 7, max: 7 } });

    // assert
    expect(row.weekChanges).toEqual({ 4: { typed: { [SET_1]: { weightKg: 75, reps: { min: 7, max: 7 } } } } });
  });

  it('gives one value back to the suggestion, then drops the week once nothing is changed in it', () => {
    // arrange
    const row = typed(squatRow(70), { week: 3 }, { weightKg: 80, reps: { min: 6, max: 6 } });

    // act
    const withoutWeight = withoutTypedTarget(row, { week: 3, setId: SET_1 }, 'weightKg');
    const withoutAny = withoutTypedTarget(withoutWeight, { week: 3, setId: SET_1 }, 'reps');

    // assert
    expect(withoutWeight.weekChanges).toEqual({ 3: { typed: { [SET_1]: { reps: { min: 6, max: 6 } } } } });
    expect(workingSetsOf(resolvedWeek(withoutWeight, 3, intermediate))[0].weightKg).toEqual({ value: 70, source: 'suggested' });
    expect(withoutAny).not.toHaveProperty('weekChanges');
  });

  it('resets one week, sets added and removed included, and leaves the other weeks changed', () => {
    // arrange
    const row = typed(withSetRemoved(withSetAdded(typed(squatRow(70), { week: 3 }, { weightKg: 80 }), 3, intermediate), { week: 3, setId: 'set-2' }), { week: 5 }, { weightKg: 85 });

    // act
    const reset = withWeekReset(row, 3);

    // assert
    expect(reset.weekChanges).toEqual({ 5: { typed: { [SET_1]: { weightKg: 85 } } } });
  });

  it('resets the first week to the block defaults and lets later weeks forget the sets it added', () => {
    // arrange
    const added = withSetAdded(squatRow(70), 1, intermediate);
    const addedId = added.weekChanges?.[1]?.added?.[0].id ?? '';
    const row = typed(added, { week: 4, setId: addedId }, { weightKg: 90 });

    // act
    const reset = withWeekReset(row, 1);

    // assert
    expect(reset).not.toHaveProperty('weekChanges');
    expect(workingCounts(resolvedWeeks(reset, intermediate))).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it('clears everything the coach did in every week at once', () => {
    // act
    const row = withoutWeekChanges(withSetAdded(typed(squatRow(70), { week: 1 }, { reps: { min: 5, max: 5 } }), 4, intermediate));

    // assert
    expect(row).not.toHaveProperty('weekChanges');
  });
});

describe('a block built from another block', () => {
  it('keeps the first week, what was typed and added in it included, and leaves later weeks behind', () => {
    // arrange
    const row = typed(withSetAdded(typed(squatRow(70), { week: 1 }, { weightKg: 72.5 }), 1, intermediate), { week: 4 }, { weightKg: 90 });

    // act
    const [copied] = sessionsCopiedFromFirstWeek([session({ rows: [row] })])[0].rows;

    // assert
    expect(copied.id).not.toBe(row.id);
    expect(Object.keys(copied.weekChanges ?? {})).toEqual(['1']);
    expect(workingCounts(resolvedWeeks(copied, intermediate))).toEqual([5, 5, 5, 5, 5, 5]);
    expect(workingSetsOf(resolvedWeek(copied, 1, intermediate))[0].weightKg).toEqual({ value: 72.5, source: 'typed' });
  });
});

describe('rowAtWeek', () => {
  it('reads as the week’s flat list of sets for the client', () => {
    // arrange
    const row = typed(withSetRemoved(withSetRemoved(withSetRemoved(squatRow(70), { week: 2, setId: 'set-2' }), { week: 2, setId: 'set-3' }), { week: 2, setId: 'set-4' }), { week: 2 }, { weightKg: 75 });

    // act
    const week = rowAtWeek(row, 2, intermediate);

    // assert
    expect(week).not.toHaveProperty('startSets');
    expect(week).not.toHaveProperty('weekChanges');
    expect(week.sets).toEqual([{ kind: 'working', reps: { min: 6, max: 8 }, rir: 3, weightKg: 75 }]);
  });
});
