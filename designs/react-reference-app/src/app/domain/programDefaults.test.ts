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
import { newId, type Block, type BlockType, type Row } from './program';

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: newId(),
    exerciseId: 'exercise-1',
    slot: 'A',
    sets: 3,
    reps: { min: 8, max: 10 },
    rir: { min: 1, max: 2 },
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
  ['foundation', 'main-compound', { sets: 3, reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 }, restSeconds: 75 }],
  ['foundation', 'secondary-compound', { sets: 3, reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 }, restSeconds: 75 }],
  ['foundation', 'isolation', { sets: 3, reps: { min: 12, max: 15 }, rir: { min: 3, max: 3 }, restSeconds: 75 }],
  ['hypertrophy', 'main-compound', { sets: 4, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSeconds: 150 }],
  ['hypertrophy', 'secondary-compound', { sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSeconds: 105 }],
  ['hypertrophy', 'isolation', { sets: 3, reps: { min: 10, max: 20 }, rir: { min: 0, max: 2 }, restSeconds: 75 }],
  ['strength', 'main-compound', { sets: 4, reps: { min: 3, max: 6 }, rir: { min: 1, max: 3 }, restSeconds: 150 }],
  ['strength', 'secondary-compound', { sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, restSeconds: 105 }],
  ['strength', 'isolation', { sets: 3, reps: { min: 10, max: 20 }, rir: { min: 0, max: 2 }, restSeconds: 75 }],
];

describe('rowDefaults', () => {
  it.each(TABLE)('gives %s %s its table values', (type, role, expected) => {
    expect(rowDefaults(type, role)).toEqual(expected);
  });

  it('halves deload sets and keeps reps and rest of the previous values', () => {
    const previous = { sets: 5, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, restSeconds: 150 };
    expect(rowDefaults('deload', 'main-compound', previous)).toEqual({
      sets: 3,
      reps: { min: 6, max: 10 },
      rir: { min: 4, max: 4 },
      restSeconds: 150,
    });
  });
});

describe('defaultedRow', () => {
  it('keeps a touched value', () => {
    const result = defaultedRow(row({ sets: 5, touched: ['sets'] }), 'strength');
    expect(result.sets).toBe(5);
    expect(result.reps).toEqual({ min: 3, max: 6 });
  });

  it('picks the role from the slot', () => {
    expect(defaultedRow(row({ slot: 'C' }), 'hypertrophy').restSeconds).toBe(75);
  });
});

describe('deloadRow', () => {
  it('never drops deload sets below one', () => {
    expect(deloadRow(row({ sets: 1 })).sets).toBe(1);
  });

  it('halves sets, sets RIR to four and clears touched', () => {
    const result = deloadRow(row({ sets: 5, touched: ['sets', 'rir'] }));
    expect(result).toMatchObject({ sets: 3, rir: { min: 4, max: 4 }, reps: { min: 8, max: 10 }, restSeconds: 90, touched: [] });
  });
});

describe('resetRowDefaults', () => {
  it('resets touched values', () => {
    const result = resetRowDefaults(row({ sets: 7, touched: ['sets'] }), 'strength');
    expect(result.sets).toBe(4);
    expect(result.touched).toEqual([]);
  });

  it('reset on a deload block keeps sets', () => {
    const result = resetRowDefaults(row({ sets: 4, reps: { min: 6, max: 8 }, restSeconds: 120, rir: { min: 1, max: 2 }, touched: ['sets', 'rir'] }), 'deload');
    expect(result).toMatchObject({ sets: 4, reps: { min: 6, max: 8 }, restSeconds: 120, rir: { min: 4, max: 4 }, touched: [] });
  });
});

describe('reDefaultedBlock', () => {
  it('re-defaults every row and sets the type', () => {
    const result = reDefaultedBlock(blockOf([row({ sets: 9, touched: ['sets'] })]), 'strength');
    expect(result.type).toBe('strength');
    expect(result.sessions[0].rows[0]).toMatchObject({ sets: 9, reps: { min: 3, max: 6 } });
  });

  it('derives deload sets from the source rows', () => {
    const result = reDefaultedBlock(blockOf([row({ sets: 4, touched: ['sets'] })]), 'deload');
    expect(result.type).toBe('deload');
    expect(result.sessions[0].rows[0]).toMatchObject({ sets: 2, rir: { min: 4, max: 4 }, touched: [] });
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
