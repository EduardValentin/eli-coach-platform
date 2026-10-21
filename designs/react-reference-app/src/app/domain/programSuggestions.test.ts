import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { Equipment, Muscle, MovementPattern } from './exercises';
import type { CardioSession, Row, Session, SetSpec } from './program';
import type { ProgramSetup } from './programOnboarding';
import {
  emptySessionsFor,
  estimatedMinutes,
  initialContent,
  newBlock,
  splitShapeFor,
  spreadCalendar,
  substitutionsFor,
  suggestedBlocks,
} from './programSuggestions';

const SETUP: ProgramSetup = {
  goal: 'Lose fat',
  level: 'beginner',
  trainingDays: 3,
  sessionMinutes: 60,
  cycleMode: 'general',
  language: 'en',
  dailySteps: 6000,
  equipment: [],
  splitShape: 'full-body',
};

function setsOf(count: number): SetSpec[] {
  return Array.from({ length: count }, () => ({ reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } }));
}

function cardio(id: string): CardioSession {
  return { id, type: 'liss', minutes: 30, intensityText: '', weekday: 'wed', placement: 'separate' };
}

function row(overrides: Partial<Row>): Row {
  return {
    id: 'r',
    exerciseId: 'e',
    slot: 'A',
    sets: setsOf(3),
    restSeconds: 60,
    lastSetTechnique: 'none',
    substitutions: [],
    progression: { kind: 'double' },
    cues: '',
    touched: [],
    ...overrides,
  };
}

function exercise(
  id: string,
  equipment: Equipment[],
  overrides: Partial<Exercise> = {},
): Exercise {
  return {
    id,
    name: id,
    cues: '',
    type: 'resistance',
    measuredIn: 'reps',
    perSide: false,
    equipment,
    difficulty: 'Beginner',
    primaryMuscles: ['Chest'] as Muscle[],
    secondaryMuscles: [],
    pattern: 'horizontal-push' as MovementPattern,
    tags: [],
    ...overrides,
  };
}

describe('suggested structure', () => {
  it('suggests blocks per level', () => {
    // act
    const blocks = [suggestedBlocks('beginner'), suggestedBlocks('intermediate'), suggestedBlocks('advanced')];

    // assert
    expect(blocks).toEqual([
      [
        { type: 'foundation', weeks: 4, calibrationWeek: false },
        { type: 'hypertrophy', weeks: 6, calibrationWeek: false },
        { type: 'deload', weeks: 1, calibrationWeek: false },
      ],
      [
        { type: 'hypertrophy', weeks: 6, calibrationWeek: true },
        { type: 'deload', weeks: 1, calibrationWeek: false },
        { type: 'hypertrophy', weeks: 6, calibrationWeek: false },
      ],
      [
        { type: 'hypertrophy', weeks: 5, calibrationWeek: true },
        { type: 'strength', weeks: 5, calibrationWeek: false },
        { type: 'deload', weeks: 1, calibrationWeek: false },
      ],
    ]);
  });

  it('picks the split shape from the days', () => {
    // act
    const shapes = [2, 3, 4, 5].map(splitShapeFor);

    // assert
    expect(shapes).toEqual(['full-body', 'full-body', 'upper-lower', 'upper-lower']);
  });
});

describe('spreadCalendar', () => {
  it('places three Full Body sessions on the split layout with cardio between and rest after', () => {
    // act
    const calendar = spreadCalendar('full-body', ['s1', 's2', 's3'], [cardio('c1'), cardio('c2')]);

    // assert
    expect(calendar).toEqual({
      mon: { kind: 'session', sessionId: 's1' },
      tue: { kind: 'cardio', cardioId: 'c1' },
      wed: { kind: 'session', sessionId: 's2' },
      thu: { kind: 'cardio', cardioId: 'c2' },
      fri: { kind: 'session', sessionId: 's3' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    });
  });

  it('places two Full Body sessions on Monday and Thursday', () => {
    // act
    const calendar = spreadCalendar('full-body', ['s1', 's2'], [cardio('c1'), cardio('c2'), cardio('c3')]);

    // assert
    expect(calendar).toEqual({
      mon: { kind: 'session', sessionId: 's1' },
      tue: { kind: 'cardio', cardioId: 'c1' },
      wed: { kind: 'cardio', cardioId: 'c2' },
      thu: { kind: 'session', sessionId: 's2' },
      fri: { kind: 'cardio', cardioId: 'c3' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    });
  });

  it('places five Upper / Lower sessions with cardio on the free days in order', () => {
    // act
    const calendar = spreadCalendar('upper-lower', ['a', 'b', 'c', 'd', 'e'], [cardio('c1'), cardio('c2')]);

    // assert
    expect(calendar).toEqual({
      mon: { kind: 'session', sessionId: 'a' },
      tue: { kind: 'session', sessionId: 'b' },
      wed: { kind: 'session', sessionId: 'c' },
      thu: { kind: 'cardio', cardioId: 'c1' },
      fri: { kind: 'session', sessionId: 'd' },
      sat: { kind: 'session', sessionId: 'e' },
      sun: { kind: 'cardio', cardioId: 'c2' },
    });
  });
});

describe('emptySessionsFor', () => {
  it('names the sessions from the split template and starts them without rows', () => {
    // act
    const sessions = emptySessionsFor('upper-lower', 4);

    // assert
    expect(sessions.map(session => session.name)).toEqual(['Lower A', 'Upper A', 'Lower B', 'Upper B']);
    expect(sessions.every(session => session.rows.length === 0)).toBe(true);
    expect(sessions[0].originId).toBe(sessions[0].id);
  });
});

describe('newBlock and initialContent', () => {
  it('halves the sets of a deload built from a previous block', () => {
    // arrange
    const built = newBlock('hypertrophy', 6, SETUP, 'en');
    const [first, ...others] = built.sessions;
    const previous = { ...built, sessions: [{ ...first, rows: [row({ sets: setsOf(4) })] }, ...others] };

    // act
    const deload = newBlock('deload', 1, SETUP, 'en', previous);

    // assert
    expect(deload.sessions[0].rows[0].sets).toEqual([
      { reps: { min: 8, max: 12 }, rir: { min: 4, max: 4 } },
      { reps: { min: 8, max: 12 }, rir: { min: 4, max: 4 } },
    ]);
    expect(deload.sessions[0].id).not.toBe(previous.sessions[0].id);
    expect(deload.sessions[0].originId).toBe(previous.sessions[0].originId);
    expect(deload.originId).not.toBe(previous.originId);
    expect(deload.split).toEqual(previous.split);
  });

  it('fills texts and settings from the setup', () => {
    // act
    const block = newBlock('foundation', 4, { ...SETUP, sessionMinutes: 45, dailySteps: 7000 }, 'en');

    // assert
    expect(block).toMatchObject({ weeks: 4, targetMinutes: 45, dailySteps: 7000, calibrationWeek: false });
    expect(block.split.shape).toBe('full-body');
    expect(block.split.text).toContain('3x per week');
    expect(block.introText).toContain('Foundation block');
    expect(block.missedDayNote).not.toBe('');
  });

  it('builds a beginner plan of three blocks with empty Full Body sessions', () => {
    // act
    const content = initialContent(SETUP);

    // assert
    expect(content.header.title).toBe('Program — weeks 1–2');
    expect(content.plan.blocks.map(b => b.type)).toEqual(['foundation', 'hypertrophy', 'deload']);
    expect(content.plan.blocks[0].sessions.map(s => s.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C']);
    expect(content.plan.blocks.every(b => b.sessions.every(s => s.rows.length === 0))).toBe(true);
  });

  it('builds the sessions of the chosen split rather than the one the days suggest', () => {
    // act
    const content = initialContent({ ...SETUP, trainingDays: 4, splitShape: 'full-body' });

    // assert
    expect(content.plan.blocks[0].split.shape).toBe('full-body');
    expect(content.plan.blocks[0].sessions.map(s => s.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C']);
  });

  it('sets the calibration week from the suggestion', () => {
    // act
    const content = initialContent({ ...SETUP, level: 'intermediate' });

    // assert
    expect(content.plan.blocks.map(b => b.calibrationWeek)).toEqual([true, false, false]);
  });
});

describe('estimatedMinutes', () => {
  const session: Session = {
    id: 's',
    originId: 's',
    name: 'A',
    warmUp: { mobilityExerciseIds: [], warmUpSetsNote: '' },
    coolDown: false,
    rows: [
      row({ id: '1', sets: setsOf(4), restSeconds: 150 }),
      row({ id: '2', slot: 'B', sets: setsOf(3), restSeconds: 105 }),
      row({ id: '3', slot: 'C', sets: setsOf(3), restSeconds: 75, supersetGroup: 'g' }),
      row({ id: '4', slot: 'C', sets: setsOf(3), restSeconds: 75, supersetGroup: 'g' }),
    ],
  };

  it('counts superset rest once per round', () => {
    // act
    const minutes = estimatedMinutes(session);

    // assert
    expect(minutes).toBe(37);
  });

  it('adds the cool-down', () => {
    // act
    const minutes = estimatedMinutes({ ...session, coolDown: true });

    // assert
    expect(minutes).toBe(42);
  });
});

describe('substitutionsFor', () => {
  const target = exercise('bench', ['Barbell', 'Bench']);

  it('picks a lighter and a heavier match within the client equipment', () => {
    // arrange
    const library = [
      target,
      exercise('machine-press', ['Machine']),
      exercise('db-press', ['Dumbbells']),
      exercise('pushup', []),
      exercise('row', [], { pattern: 'horizontal-pull' }),
      exercise('archived', [], { archivedAt: '2026-01-01' }),
      exercise('other-muscle', [], { primaryMuscles: ['Triceps'] }),
    ];

    // act
    const ids = substitutionsFor(target, library, ['Dumbbells', 'Machine']);

    // assert
    expect(ids).toEqual(['db-press', 'machine-press']);
  });

  it('falls back to equipment the client lacks', () => {
    // arrange
    const library = [target, exercise('cable-fly', ['Cable']), exercise('db-press', ['Dumbbells'])];

    // act
    const ids = substitutionsFor(target, library, ['Dumbbells']);

    // assert
    expect(ids).toEqual(['db-press', 'cable-fly']);
  });

  it('returns nothing without a matching exercise', () => {
    // act
    const ids = substitutionsFor(target, [target], []);

    // assert
    expect(ids).toEqual([]);
  });
});
