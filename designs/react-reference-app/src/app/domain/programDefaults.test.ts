import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { ExerciseRole } from './exercises';
import { cardioMinutes } from './programCardio';
import {
  cardioDefaults,
  defaultedRow,
  deloadRow,
  reDefaultedBlock,
  resetRowDefaults,
  rowDefaults,
  type RowDefaults,
} from './programDefaults';
import { newId, type Block, type BlockType, type Range, type Row, type SetSpec } from './program';

function setsOf(count: number, reps: Range, rir: Range): SetSpec[] {
  return Array.from({ length: count }, () => ({ kind: 'working', reps: { ...reps }, rir: { ...rir } }));
}

const WARM_UPS: SetSpec[] = [
  { kind: 'warm-up', reps: { min: 8, max: 8 }, weightKg: 20 },
  { kind: 'warm-up', reps: { min: 5, max: 5 } },
];

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: newId(),
    exerciseId: 'exercise-1',
    slot: 'A',
    sets: setsOf(3, { min: 8, max: 10 }, { min: 1, max: 2 }),
    restSeconds: 90,
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
    ...overrides,
  };
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
        coolDown: { enabled: false, note: '', items: [] },
        rows,
      },
    ],
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: '',
  };
}

const TABLE: [BlockType, ExerciseRole, RowDefaults][] = [
  ['foundation', 'main-compound', { sets: setsOf(3, { min: 12, max: 15 }, { min: 3, max: 3 }), restSeconds: 75 }],
  ['foundation', 'secondary-compound', { sets: setsOf(3, { min: 12, max: 15 }, { min: 3, max: 3 }), restSeconds: 75 }],
  ['foundation', 'isolation', { sets: setsOf(3, { min: 12, max: 15 }, { min: 3, max: 3 }), restSeconds: 75 }],
  ['hypertrophy', 'main-compound', { sets: setsOf(4, { min: 6, max: 10 }, { min: 1, max: 2 }), restSeconds: 150 }],
  ['hypertrophy', 'secondary-compound', { sets: setsOf(3, { min: 8, max: 12 }, { min: 1, max: 2 }), restSeconds: 105 }],
  ['hypertrophy', 'isolation', { sets: setsOf(3, { min: 10, max: 20 }, { min: 0, max: 2 }), restSeconds: 75 }],
  ['strength', 'main-compound', { sets: setsOf(4, { min: 3, max: 6 }, { min: 1, max: 3 }), restSeconds: 150 }],
  ['strength', 'secondary-compound', { sets: setsOf(3, { min: 8, max: 12 }, { min: 1, max: 2 }), restSeconds: 105 }],
  ['strength', 'isolation', { sets: setsOf(3, { min: 10, max: 20 }, { min: 0, max: 2 }), restSeconds: 75 }],
];

describe('rowDefaults', () => {
  it.each(TABLE)('gives %s %s its table values', (type, role, expected) => {
    expect(rowDefaults(type, role)).toEqual(expected);
  });

  it('creates working sets only', () => {
    // act
    const { sets } = rowDefaults('hypertrophy', 'main-compound');

    // assert
    expect(sets.every(set => set.kind === 'working')).toBe(true);
  });

  it('halves deload sets and keeps reps and rest of the previous values', () => {
    // arrange
    const previous = { sets: setsOf(5, { min: 6, max: 10 }, { min: 1, max: 2 }), restSeconds: 150 };

    // act
    const result = rowDefaults('deload', 'main-compound', previous);

    // assert
    expect(result).toEqual({ sets: setsOf(3, { min: 6, max: 10 }, { min: 4, max: 4 }), restSeconds: 150 });
  });

  it('keeps per-set reps of the previous sets on a deload', () => {
    // arrange
    const previous: RowDefaults = {
      sets: [
        { kind: 'working', reps: { min: 5, max: 5 }, rir: { min: 1, max: 1 } },
        { kind: 'working', reps: { min: 8, max: 10 }, rir: { min: 2, max: 2 } },
      ],
      restSeconds: 120,
    };

    // act
    const result = rowDefaults('deload', 'main-compound', previous);

    // assert
    expect(result.sets).toEqual([{ kind: 'working', reps: { min: 5, max: 5 }, rir: { min: 4, max: 4 } }]);
  });
});

describe('defaultedRow', () => {
  it('keeps touched sets and refills rest', () => {
    // arrange
    const custom = setsOf(5, { min: 2, max: 2 }, { min: 0, max: 0 });

    // act
    const result = defaultedRow(row({ sets: custom, touched: ['sets'] }), 'strength');

    // assert
    expect(result.sets).toEqual(custom);
    expect(result.restSeconds).toBe(150);
  });

  it('refills untouched sets from the block type', () => {
    // act
    const result = defaultedRow(row(), 'strength');

    // assert
    expect(result.sets).toEqual(setsOf(4, { min: 3, max: 6 }, { min: 1, max: 3 }));
  });

  it('keeps the warm-up sets in front of refilled working sets', () => {
    // act
    const result = defaultedRow(row({ sets: [...WARM_UPS, ...setsOf(2, { min: 8, max: 10 }, { min: 1, max: 2 })] }), 'strength');

    // assert
    expect(result.sets).toEqual([...WARM_UPS, ...setsOf(4, { min: 3, max: 6 }, { min: 1, max: 3 })]);
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
    const result = deloadRow(row({ sets: setsOf(1, { min: 8, max: 10 }, { min: 1, max: 2 }) }));

    // assert
    expect(result.sets).toHaveLength(1);
  });

  it('halves sets, sets every RIR to four and clears touched', () => {
    // arrange
    const source = row({ sets: setsOf(5, { min: 8, max: 10 }, { min: 1, max: 2 }), touched: ['sets'] });

    // act
    const result = deloadRow(source);

    // assert
    expect(result).toMatchObject({
      sets: setsOf(3, { min: 8, max: 10 }, { min: 4, max: 4 }),
      restSeconds: 90,
      touched: [],
    });
  });

  it('halves only the working sets and keeps the warm-ups', () => {
    // arrange
    const source = row({ sets: [...WARM_UPS, ...setsOf(4, { min: 8, max: 10 }, { min: 1, max: 2 })] });

    // act
    const result = deloadRow(source);

    // assert
    expect(result.sets).toEqual([...WARM_UPS, ...setsOf(2, { min: 8, max: 10 }, { min: 4, max: 4 })]);
  });

  it('reduces suggested working weights by 15 % to the nearest half kilo', () => {
    // arrange
    const working = (weightKg?: number): SetSpec => ({
      kind: 'working',
      reps: { min: 8, max: 8 },
      rir: { min: 2, max: 2 },
      ...(weightKg === undefined ? {} : { weightKg }),
    });
    const source = row({ sets: [working(42), working(37)] });

    // act
    const result = deloadRow(source);

    // assert
    expect(result.sets).toEqual([{ kind: 'working', reps: { min: 8, max: 8 }, rir: { min: 4, max: 4 }, weightKg: 35.5 }]);
  });

  it('leaves sets without a suggested weight without one', () => {
    // act
    const result = deloadRow(row({ sets: setsOf(2, { min: 8, max: 10 }, { min: 1, max: 2 }) }));

    // assert
    expect(result.sets[0]).not.toHaveProperty('weightKg');
  });
});

describe('resetRowDefaults', () => {
  it('resets touched values', () => {
    // arrange
    const source = row({ sets: setsOf(7, { min: 1, max: 1 }, { min: 0, max: 0 }), touched: ['sets'] });

    // act
    const result = resetRowDefaults(source, 'strength');

    // assert
    expect(result.sets).toEqual(setsOf(4, { min: 3, max: 6 }, { min: 1, max: 3 }));
    expect(result.touched).toEqual([]);
  });

  it('reset on a deload block keeps sets and sets RIR to four', () => {
    // arrange
    const source = row({ sets: setsOf(4, { min: 6, max: 8 }, { min: 1, max: 2 }), restSeconds: 120, touched: ['sets'] });

    // act
    const result = resetRowDefaults(source, 'deload');

    // assert
    expect(result).toMatchObject({
      sets: setsOf(4, { min: 6, max: 8 }, { min: 4, max: 4 }),
      restSeconds: 120,
      touched: [],
    });
  });
});

describe('reDefaultedBlock', () => {
  it('re-defaults every row and sets the type', () => {
    // arrange
    const custom = setsOf(9, { min: 8, max: 10 }, { min: 1, max: 2 });

    // act
    const result = reDefaultedBlock(blockOf([row({ sets: custom, touched: ['sets'] })]), 'strength');

    // assert
    expect(result.type).toBe('strength');
    expect(result.sessions[0].rows[0]).toMatchObject({ sets: custom, restSeconds: 150 });
  });

  it('derives deload sets from the source rows', () => {
    // arrange
    const source = row({ sets: setsOf(4, { min: 8, max: 10 }, { min: 1, max: 2 }), touched: ['sets'] });

    // act
    const result = reDefaultedBlock(blockOf([source]), 'deload');

    // assert
    expect(result.type).toBe('deload');
    expect(result.sessions[0].rows[0]).toMatchObject({
      sets: setsOf(2, { min: 8, max: 10 }, { min: 4, max: 4 }),
      touched: [],
    });
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
