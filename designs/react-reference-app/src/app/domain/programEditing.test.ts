import { describe, expect, it } from 'vitest';
import { exercise, row, startSets } from '../../test/programFixtures';
import type { Exercise } from '../context/TrainingContext';
import type { Block, Row, SetTargets, Session } from './program';
import { blockWithType, libraryPickRefusal, type LibraryPick, type LibraryTarget } from './programEditing';
import type { RowContext } from './programSuggestions';

const SQUAT = exercise('squat', { equipment: ['Barbell'], role: 'main-compound' });

function squatRow(weightKg: number): Row {
  return row({ id: 'row-1', exerciseId: 'squat', startSets: startSets({ count: 4, reps: { min: 6, max: 8 }, rir: 3, lastSetRir: 2, weightKg }), restSeconds: 90 });
}

function hypertrophyBlock(rows: Row[], weeks: number): Block {
  return {
    id: `block-${weeks}`,
    originId: `block-${weeks}`,
    type: 'hypertrophy',
    weeks,
    trainingDays: 2,
    calibrationWeek: false,
    introText: '',
    clientNote: '',
    split: { shape: 'full-body', name: '', text: '' },
    targetMinutes: 45,
    calendar: {
      mon: { kind: 'session', sessionId: 'session-1' },
      tue: { kind: 'rest' },
      wed: { kind: 'rest' },
      thu: { kind: 'rest' },
      fri: { kind: 'rest' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    },
    sessions: [{ id: 'session-1', originId: 'session-1', name: 'A', warmUp: { items: [] }, coolDown: { enabled: false, items: [] }, rows }],
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: '',
  };
}

function workingStartsOf(block: Block): SetTargets[] {
  return block.sessions[0].rows[0].startSets.filter(set => set.kind === 'working').map(set => set.start);
}

describe('blockWithType', () => {
  it('switches a block to a Deload one week long, prefilled from the last loading week of the block before it', () => {
    // arrange
    const previous = hypertrophyBlock([squatRow(70)], 6);
    const block = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockWithType(block, 'deload', { previous, level: 'intermediate', library: [SQUAT] });

    // assert
    expect(result).toMatchObject({ type: 'deload', weeks: 1 });
    expect(workingStartsOf(result)).toEqual([
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
    ]);
  });

  it('changes a block to another type with that type’s default rest, keeping its weeks and its days', () => {
    // arrange
    const block = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockWithType(block, 'strength', { previous: undefined, level: 'intermediate', library: [SQUAT] });

    // assert
    expect(result).toMatchObject({ type: 'strength', weeks: 4, calendar: block.calendar });
    expect(result.sessions[0].rows[0].restSeconds).toBe(150);
  });
});

describe('libraryPickRefusal', () => {
  const MOBILITY = exercise('hips', { type: 'mobility' });
  const STRETCH = exercise('hamstringStretch', { type: 'stretching' });
  const OTHERS = ['a', 'b', 'c', 'd', 'e'].map(id => exercise(id, { type: 'mobility' }));
  const PLANK = exercise('plank');
  const CARDIO = exercise('rowing', { type: 'cardio' });
  const LIBRARY = [SQUAT, MOBILITY, STRETCH, PLANK, CARDIO, ...OTHERS];
  const CONTEXT: RowContext = { blockType: 'hypertrophy', library: LIBRARY, equipment: [] };

  function warmUpItem(exerciseId: string): Session['warmUp']['items'][number] {
    return { id: `warm-up-${exerciseId}`, exerciseId, sets: 1, reps: { min: 10, max: 10 } };
  }

  function blockWith(overrides: Partial<Session>): Block {
    const block = hypertrophyBlock([squatRow(60)], 4);
    return {
      ...block,
      sessions: [{ ...block.sessions[0], ...overrides }],
      cardioSessions: [{ id: 'cardio-1', originId: 'cardio-1', name: 'Easy cardio', segments: [] }],
    };
  }

  function pick(exerciseToAdd: Exercise, target: LibraryTarget | null): LibraryPick {
    return { exercise: exerciseToAdd, target, openSessionId: 'session-1' };
  }

  it('refuses a fifth warm-up exercise and one already in the warm-up, whether the warm-up or the exercise’s type chose the place', () => {
    // arrange
    const four = blockWith({ warmUp: { items: ['a', 'b', 'c', 'd'].map(warmUpItem) } });
    const hasHips = blockWith({ warmUp: { items: [warmUpItem('hips')] } });
    const warmUpTarget: LibraryTarget = { kind: 'warm-up', sessionId: 'session-1' };

    // act
    const fifth = libraryPickRefusal(four, pick(OTHERS[4], warmUpTarget), CONTEXT);
    const fifthByType = libraryPickRefusal(four, pick(OTHERS[4], null), CONTEXT);
    const repeated = libraryPickRefusal(hasHips, pick(MOBILITY, warmUpTarget), CONTEXT);
    const fourth = libraryPickRefusal(hasHips, pick(OTHERS[0], warmUpTarget), CONTEXT);

    // assert
    expect(fifth).toBe('warm-up-full');
    expect(fifthByType).toBe('warm-up-full');
    expect(repeated).toBe('already-in-warm-up');
    expect(fourth).toBeUndefined();
  });

  it('refuses a stretch already in the cool-down', () => {
    // arrange
    const block = blockWith({ coolDown: { enabled: true, items: [{ id: 'stretch-1', exerciseId: 'hamstringStretch', seconds: 30 }] } });

    // act
    const repeated = libraryPickRefusal(block, pick(STRETCH, { kind: 'cool-down', sessionId: 'session-1' }), CONTEXT);
    const repeatedByType = libraryPickRefusal(block, pick(STRETCH, null), CONTEXT);

    // assert
    expect(repeated).toBe('already-in-cool-down');
    expect(repeatedByType).toBe('already-in-cool-down');
  });

  it('refuses a substitution that is the row’s own exercise, one it already has, or a third', () => {
    // arrange
    const target: LibraryTarget = { kind: 'substitution', sessionId: 'session-1', rowId: 'row-1' };
    const withTwo = blockWith({ rows: [{ ...squatRow(60), substitutions: ['plank', 'hips'] }] });
    const withOne = blockWith({ rows: [{ ...squatRow(60), substitutions: ['plank'] }] });

    // act
    const own = libraryPickRefusal(withOne, pick(SQUAT, target), CONTEXT);
    const repeated = libraryPickRefusal(withOne, pick(PLANK, target), CONTEXT);
    const third = libraryPickRefusal(withTwo, pick(OTHERS[0], target), CONTEXT);
    const second = libraryPickRefusal(withOne, pick(OTHERS[0], target), CONTEXT);

    // assert
    expect(own).toBe('own-substitution');
    expect(repeated).toBe('already-a-substitution');
    expect(third).toBe('substitutions-full');
    expect(second).toBeUndefined();
  });

  it('refuses an exercise that is not cardio when the open session is a cardio one', () => {
    // arrange
    const block = blockWith({});
    const cardioPick = (exerciseToAdd: Exercise): LibraryPick => ({ exercise: exerciseToAdd, target: null, openSessionId: 'cardio-1' });

    // act
    const resistance = libraryPickRefusal(block, cardioPick(PLANK), CONTEXT);
    const cardio = libraryPickRefusal(block, cardioPick(CARDIO), CONTEXT);

    // assert
    expect(resistance).toBe('not-cardio');
    expect(cardio).toBeUndefined();
  });

  it('refuses nothing for a resistance exercise going into a group', () => {
    // arrange
    const block = blockWith({});

    // act
    const refusal = libraryPickRefusal(block, pick(PLANK, { kind: 'slot', sessionId: 'session-1', slot: 'C' }), CONTEXT);

    // assert
    expect(refusal).toBeUndefined();
  });
});
