import { describe, expect, it } from 'vitest';
import { row as fixtureRow } from '../../test/programFixtures';
import type { Exercise } from '../context/TrainingContext';
import type { ExerciseRole } from './exercises';
import { cardioMinutes } from './programCardio';
import {
  blockSwitchedToDeload,
  cardioDefaults,
  defaultedRow,
  deloadedBlock,
  deloadRow,
  reDefaultedBlock,
  resetRowDefaults,
  rowDefaults,
  type RowDefaults,
} from './programDefaults';
import { newId, type Block, type BlockType, type Range, type Row, type SetTargets, type WorkingTargets } from './program';
import { exercise, startSets } from '../../test/programFixtures';
import { resolvedWeek, withSetRemoved, withTypedTargets, workingSetsOf } from './programProgression';

type RirStart = Pick<WorkingTargets, 'rir' | 'lastSetRir'>;
const LOADING_RIR: RirStart = { rir: 3, lastSetRir: 2 };

function start(count: number, reps: Range, rir: RirStart, weightKg?: number): WorkingTargets {
  return { count, reps: { ...reps }, ...rir, ...(weightKg === undefined ? {} : { weightKg }) };
}

function targets(reps: Range, rir: number, weightKg?: number): SetTargets {
  return { reps: { ...reps }, rir, ...(weightKg === undefined ? {} : { weightKg }) };
}

/** `count` working sets at RIR 3 and a last one at RIR 2, as a Hypertrophy or Strength block starts them. */
function loadingSets(count: number, reps: Range, weightKg?: number): SetTargets[] {
  return [...times(count - 1, targets(reps, 3, weightKg)), targets(reps, 2, weightKg)];
}

function times(count: number, set: SetTargets): SetTargets[] {
  return Array.from({ length: count }, () => structuredClone(set));
}

const WARM_UPS: SetTargets[] = [targets({ min: 8, max: 8 }, 3, 20), targets({ min: 5, max: 5 }, 3)];

function row(overrides: Partial<Row> = {}): Row {
  return fixtureRow({ id: newId(), exerciseId: 'exercise-1', startSets: startSets(start(3, { min: 8, max: 10 }, { rir: 2 })), restSeconds: 90, ...overrides });
}

function rowStarting(working: WorkingTargets, warmUps: readonly SetTargets[] = []): Partial<Row> {
  return { startSets: startSets(working, warmUps) };
}

function startsOf(row: Row, kind: 'warm-up' | 'working' = 'working'): SetTargets[] {
  return row.startSets.filter(set => set.kind === kind).map(set => set.start);
}

function blockOf(rows: Row[]): Block {
  return {
    id: 'block-1',
    originId: 'block-1',
    type: 'hypertrophy',
    weeks: 4,
    trainingDays: 2,
    calibrationWeek: false,
    introText: '',
    clientNote: '',
    split: { shape: 'full-body', name: '', text: '' },
    targetMinutes: 45,
    calendar: {
      mon: { kind: 'rest' },
      tue: { kind: 'rest' },
      wed: { kind: 'rest' },
      thu: { kind: 'rest' },
      fri: { kind: 'rest' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    },
    sessions: [
      {
        id: 'session-1',
        originId: 'session-1',
        name: 'A',
        warmUp: { items: [] },
        coolDown: { enabled: false, items: [] },
        rows,
      },
    ],
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: '',
  };
}

const TABLE: [BlockType, ExerciseRole, RowDefaults][] = [
  ['foundation', 'main-compound', { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 }],
  ['foundation', 'secondary-compound', { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 }],
  ['foundation', 'isolation', { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 }],
  ['hypertrophy', 'main-compound', { start: start(4, { min: 6, max: 10 }, LOADING_RIR), restSeconds: 150 }],
  ['hypertrophy', 'secondary-compound', { start: start(3, { min: 8, max: 12 }, LOADING_RIR), restSeconds: 105 }],
  ['hypertrophy', 'isolation', { start: start(3, { min: 10, max: 20 }, LOADING_RIR), restSeconds: 75 }],
  ['strength', 'main-compound', { start: start(4, { min: 3, max: 6 }, LOADING_RIR), restSeconds: 150 }],
  ['strength', 'secondary-compound', { start: start(3, { min: 8, max: 12 }, LOADING_RIR), restSeconds: 105 }],
  ['strength', 'isolation', { start: start(3, { min: 10, max: 20 }, LOADING_RIR), restSeconds: 75 }],
];

describe('rowDefaults', () => {
  it.each(TABLE)('gives %s %s its table values', (type, role, expected) => {
    expect(rowDefaults(type, role)).toEqual(expected);
  });

  it('gives a new row in a Deload block half the Hypertrophy sets at RIR 4', () => {
    // act
    const result = rowDefaults('deload', 'main-compound');

    // assert
    expect(result).toEqual({ start: start(2, { min: 6, max: 10 }, { rir: 4 }), restSeconds: 150 });
  });
});

describe('defaultedRow', () => {
  it('refills what the working sets start from and keeps what the coach typed', () => {
    // arrange
    const typed = withTypedTargets(row(), { week: 1, setId: 'set-1' }, { reps: { min: 2, max: 2 }, weightKg: 80 });

    // act
    const result = defaultedRow(typed, 'strength');

    // assert
    expect(startsOf(result)).toEqual(loadingSets(4, { min: 3, max: 6 }));
    expect(result.weekChanges).toEqual({ 1: { typed: { 'set-1': { reps: { min: 2, max: 2 }, weightKg: 80 } } } });
    expect(result.restSeconds).toBe(150);
  });

  it('keeps the warm-up sets and a weight the sets start from', () => {
    // act
    const result = defaultedRow(row(rowStarting(start(2, { min: 8, max: 10 }, { rir: 2 }, 60), WARM_UPS)), 'strength');

    // assert
    expect(startsOf(result, 'warm-up')).toEqual(WARM_UPS);
    expect(startsOf(result)).toEqual(loadingSets(4, { min: 3, max: 6 }, 60));
  });

  it('lets later weeks forget the working sets the new defaults no longer have', () => {
    // arrange
    const typed = withTypedTargets(row(rowStarting(start(4, { min: 6, max: 10 }, LOADING_RIR))), { week: 3, setId: 'set-4' }, { weightKg: 50 });

    // act
    const result = defaultedRow(typed, 'foundation');

    // assert
    expect(startsOf(result)).toHaveLength(3);
    expect(result).not.toHaveProperty('weekChanges');
  });

  it('keeps a typed rest', () => {
    // act
    const result = defaultedRow(row({ restSeconds: 45, touched: ['restSeconds'] }), 'strength');

    // assert
    expect(result.restSeconds).toBe(45);
  });

  it('picks the role from the slot', () => {
    // act
    const result = defaultedRow(row({ slot: 'C' }), 'hypertrophy');

    // assert
    expect(result.restSeconds).toBe(75);
  });
});

describe('deloadRow', () => {
  it('never drops deload sets below one', () => {
    // act
    const result = deloadRow(row(rowStarting(start(1, { min: 8, max: 10 }, { rir: 2 }))));

    // assert
    expect(startsOf(result)).toHaveLength(1);
  });

  it('halves the working sets of the first week as typed, keeps its warm-up sets, sets RIR to four and clears the rest', () => {
    // arrange
    const source = withTypedTargets(row({ ...rowStarting(start(5, { min: 8, max: 10 }, { rir: 2 }), WARM_UPS), touched: ['restSeconds'] }), { week: 1, setId: 'set-1' }, { reps: { min: 5, max: 5 } });

    // act
    const result = deloadRow(source);

    // assert
    expect(startsOf(result, 'warm-up')).toEqual(WARM_UPS);
    expect(startsOf(result)).toEqual([targets({ min: 5, max: 5 }, 4), ...times(2, targets({ min: 8, max: 10 }, 4))]);
    expect(result).not.toHaveProperty('weekChanges');
    expect(result).toMatchObject({ restSeconds: 90, touched: [] });
  });

  it('reduces suggested working weights by 10 %, rounded down to the weight step', () => {
    // act
    const result = deloadRow(row(rowStarting(start(2, { min: 8, max: 8 }, { rir: 2 }, 42))));

    // assert
    expect(startsOf(result)).toEqual([targets({ min: 8, max: 8 }, 4, 37.5)]);
  });

  it('leaves sets without a suggested weight without one', () => {
    // act
    const result = deloadRow(row());

    // assert
    expect(startsOf(result)[0]).not.toHaveProperty('weightKg');
  });
});

describe('deload weights', () => {
  it.each([
    [['Barbell'] as const, 60, 50],
    [['Barbell'] as const, 40, 35],
    [['Barbell'] as const, 20, 20],
    [['Dumbbells'] as const, 12, 10],
    [['Dumbbells'] as const, 5, 4],
    [['Dumbbells'] as const, 4, 4],
    [['Kettlebell'] as const, 8, 8],
  ])('take 10 %% off in the steps of %j and round down, keeping the load when that cuts more than 20 %%: %s kg to %s kg', (equipment, weightKg, expected) => {
    // arrange
    const lift = exercise('lift', { equipment: [...equipment] });
    const held = row({ exerciseId: 'lift', progression: { kind: 'custom', text: '' }, ...rowStarting(start(2, { min: 8, max: 8 }, { rir: 2 }, weightKg)) });

    // act
    const result = deloadedBlock(blockOf([held]), { level: 'intermediate', library: [lift] });

    // assert
    expect(startsOf(result.sessions[0].rows[0])[0].weightKg).toBe(expected);
  });
});

describe('deloadedBlock', () => {
  const squat = exercise('squat', { equipment: ['Barbell'], role: 'main-compound' });

  it('sources the deload from the resolved sets of the last loading week, its warm-up sets included', () => {
    // arrange
    const warmUp = targets({ min: 5, max: 5 }, 3, 40);
    const source = { ...blockOf([row({ exerciseId: 'squat', ...rowStarting(start(4, { min: 6, max: 8 }, LOADING_RIR, 70), [warmUp]) })]), weeks: 6 };

    // act
    const result = deloadedBlock(source, { level: 'intermediate', library: [squat] });

    // assert
    const [deloaded] = result.sessions[0].rows;
    expect(result.type).toBe('deload');
    expect(startsOf(deloaded, 'warm-up')).toEqual([{ ...warmUp, weightKg: 45 }]);
    expect(startsOf(deloaded)).toEqual(times(2, targets({ min: 7, max: 8 }, 4, 65)));
    expect(deloaded.touched).toEqual([]);
  });

  it('halves the working sets of the last week, which may differ from the first week', () => {
    // arrange
    const plain = row({ exerciseId: 'squat', ...rowStarting(start(4, { min: 6, max: 8 }, LOADING_RIR, 70)) });
    const typed = withTypedTargets(withSetRemoved(plain, { week: 6, setId: 'set-4' }), { week: 6, setId: 'set-1' }, { reps: { min: 3, max: 3 }, weightKg: 90 });
    const source = { ...blockOf([typed]), weeks: 6 };

    // act
    const result = deloadedBlock(source, { level: 'intermediate', library: [squat] });

    // assert
    const [deloaded] = result.sessions[0].rows;
    expect(startsOf(deloaded)).toEqual([targets({ min: 3, max: 3 }, 4, 80), targets({ min: 7, max: 8 }, 4, 65)]);
    expect(deloaded).not.toHaveProperty('weekChanges');
  });
});

describe('blockSwitchedToDeload', () => {
  const squat = exercise('squat', { equipment: ['Barbell'], role: 'main-compound' });
  const curl = exercise('curl', { equipment: ['Dumbbells'], role: 'isolation' });
  const loaded = (count: number, weightKg: number) => rowStarting(start(count, { min: 6, max: 8 }, LOADING_RIR, weightKg));

  it("sources each row from the previous block's last loading week of the same exercise", () => {
    // arrange
    const previous = { ...blockOf([row({ exerciseId: 'squat', ...loaded(4, 70) })]), weeks: 6 };
    const current = blockOf([row({ exerciseId: 'squat', ...loaded(4, 60) })]);

    // act
    const result = blockSwitchedToDeload(current, { previous, level: 'intermediate', library: [squat] });

    // assert
    expect(result).toMatchObject({ type: 'deload', weeks: 1 });
    expect(startsOf(result.sessions[0].rows[0])).toEqual(times(2, targets({ min: 7, max: 8 }, 4, 65)));
  });

  it("falls back to the row's own first week with its equipment step when no earlier block has the exercise", () => {
    // arrange
    const previous = { ...blockOf([row({ exerciseId: 'squat', ...loaded(4, 70) })]), weeks: 6 };
    const current = blockOf([row({ exerciseId: 'curl', ...loaded(3, 13) })]);

    // act
    const result = blockSwitchedToDeload(current, { previous, level: 'intermediate', library: [squat, curl] });

    // assert
    expect(startsOf(result.sessions[0].rows[0])).toEqual(times(2, targets({ min: 6, max: 8 }, 4, 11)));
  });
});

describe('resetRowDefaults', () => {
  it('gives the row back its block defaults: the slot’s warm-up sets, the default working sets, nothing changed in any week', () => {
    // arrange
    const typed = withTypedTargets(row({ touched: ['restSeconds'], ...rowStarting(start(2, { min: 8, max: 10 }, { rir: 2 }, 60), WARM_UPS) }), { week: 1, setId: 'warm-up-1' }, { weightKg: 30 });
    const source = withSetRemoved(typed, { week: 2, setId: 'set-2' });

    // act
    const result = resetRowDefaults(source, 'strength');

    // assert
    expect(startsOf(result, 'warm-up')).toEqual([targets({ min: 8, max: 8 }, 3), targets({ min: 5, max: 5 }, 3)]);
    expect(startsOf(result)).toEqual(loadingSets(4, { min: 3, max: 6 }));
    expect(result).not.toHaveProperty('weekChanges');
    expect(result).toMatchObject({ restSeconds: 150, touched: [] });
  });

  it('clears every week change of the row in any block', () => {
    // arrange
    const edited = withTypedTargets(row(), { week: 3, setId: 'set-1' }, { weightKg: 50 });

    // act
    const result = [resetRowDefaults(edited, 'hypertrophy'), resetRowDefaults(edited, 'deload')];

    // assert
    expect(result.every(reset => !('weekChanges' in reset))).toBe(true);
  });

  it('reset on a deload block keeps the prefilled sets and sets RIR to four', () => {
    // arrange
    const source = row({ ...rowStarting(start(4, { min: 6, max: 8 }, { rir: 2 })), restSeconds: 120, touched: ['restSeconds'] });

    // act
    const result = resetRowDefaults(source, 'deload');

    // assert
    expect(startsOf(result)).toEqual(times(4, targets({ min: 6, max: 8 }, 4)));
    expect(result).toMatchObject({ restSeconds: 120, touched: [] });
  });
});

describe('reDefaultedBlock', () => {
  it('re-defaults every row, sets the type and keeps what the coach typed', () => {
    // arrange
    const typed = withTypedTargets(row(), { week: 1, setId: 'set-1' }, { reps: { min: 9, max: 9 } });

    // act
    const result = reDefaultedBlock(blockOf([typed]), 'strength');

    // assert
    expect(result.type).toBe('strength');
    expect(result.sessions[0].rows[0].restSeconds).toBe(150);
    expect(workingSetsOf(resolvedWeek(result.sessions[0].rows[0], 1, { block: result, level: 'intermediate' }))[0].reps).toEqual({ value: { min: 9, max: 9 }, source: 'typed' });
  });

  it('derives deload sets from the source rows', () => {
    // arrange
    const source = row(rowStarting(start(4, { min: 8, max: 10 }, { rir: 2 })));

    // act
    const result = reDefaultedBlock(blockOf([source]), 'deload');

    // assert
    expect(result.type).toBe('deload');
    expect(startsOf(result.sessions[0].rows[0])).toEqual(times(2, targets({ min: 8, max: 10 }, 4)));
    expect(result.sessions[0].rows[0].touched).toEqual([]);
  });
});

describe('cardioDefaults', () => {
  const library: Exercise[] = [
    { id: 'bike', name: 'Stationary bike', cues: '', type: 'cardio', measuredIn: 'time', perSide: false, equipment: ['Bike'], difficulty: 'Beginner', primaryMuscles: [], secondaryMuscles: [], tags: [] },
  ];

  it('gives a deload one easy cardio session', () => {
    // act
    const sessions = cardioDefaults('deload', library);

    // assert
    expect(sessions.map(session => session.name)).toEqual(['Easy cardio']);
    expect(sessions[0].segments[0]).toMatchObject({ kind: 'steady', exerciseId: 'bike' });
  });

  it('gives a foundation two easy cardio sessions', () => {
    // act
    const names = cardioDefaults('foundation', library).map(session => session.name);

    // assert
    expect(names).toEqual(['Easy cardio', 'Easy cardio']);
  });

  it.each(['hypertrophy', 'strength'] as const)('gives %s two easy and one moderate session', type => {
    // act
    const sessions = cardioDefaults(type, library);

    // assert
    expect(sessions.map(session => [session.name, cardioMinutes(session)])).toEqual([
      ['Easy cardio', 30],
      ['Easy cardio', 30],
      ['Moderate cardio', 25],
    ]);
  });

  it('gives fresh ids each call', () => {
    expect(cardioDefaults('foundation', library)[0].id).not.toBe(cardioDefaults('foundation', library)[0].id);
  });
});
