import { describe, expect, it } from 'vitest';
import type { ExerciseRole } from './exercises';
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
  return Array.from({ length: count }, () => ({ reps: { ...reps }, rir: { ...rir } }));
}

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
        warmUp: { mobilityExerciseIds: [], warmUpSetsNote: '' },
        coolDown: false,
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
    const previous = {
      sets: [
        { reps: { min: 5, max: 5 }, rir: { min: 1, max: 1 } },
        { reps: { min: 8, max: 10 }, rir: { min: 2, max: 2 } },
      ],
      restSeconds: 120,
    };

    // act
    const result = rowDefaults('deload', 'main-compound', previous);

    // assert
    expect(result.sets).toEqual([{ reps: { min: 5, max: 5 }, rir: { min: 4, max: 4 } }]);
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
  it('gives a deload one LISS session', () => {
    const sessions = cardioDefaults('deload');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ type: 'liss', minutes: 30, placement: 'separate' });
  });

  it('gives a foundation two LISS sessions', () => {
    expect(cardioDefaults('foundation').map(session => session.type)).toEqual(['liss', 'liss']);
  });

  it.each(['hypertrophy', 'strength'] as const)('gives %s two LISS and one moderate session', type => {
    const sessions = cardioDefaults(type);
    expect(sessions.map(session => [session.type, session.minutes, session.weekday])).toEqual([
      ['liss', 30, 'wed'],
      ['liss', 30, 'sun'],
      ['moderate', 25, 'sat'],
    ]);
    expect(sessions[2].intensityText).toBe('You can talk, but not sing');
  });

  it('gives fresh ids each call', () => {
    expect(cardioDefaults('foundation')[0].id).not.toBe(cardioDefaults('foundation')[0].id);
  });
});
