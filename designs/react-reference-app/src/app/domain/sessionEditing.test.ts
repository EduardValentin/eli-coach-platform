import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import { positionLabel, type Row, type Session } from './program';
import { emptySessionsFor } from './programSuggestions';
import { quickAddSlot, sessionEdits, slotUnits, type SessionEditContext } from './sessionEditing';
import { newBlock } from './programSuggestions';

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    cues: `${id} cues`,
    type: 'resistance',
    measuredIn: 'reps',
    perSide: false,
    equipment: [],
    difficulty: 'Beginner',
    primaryMuscles: ['Glutes'],
    secondaryMuscles: [],
    pattern: 'isolation',
    tags: [],
    ...overrides,
  };
}

const LIBRARY: Exercise[] = [
  exercise('squat', { pattern: 'squat' }),
  exercise('hinge', { pattern: 'hinge' }),
  exercise('curl'),
  exercise('raise'),
  exercise('kickback'),
  exercise('plank', { pattern: 'core', primaryMuscles: ['Core'] }),
  exercise('hips', { type: 'mobility', measuredIn: 'reps', pattern: undefined }),
  exercise('catCow', { type: 'mobility', measuredIn: 'time', pattern: undefined }),
];

const CONTEXT: SessionEditContext = { blockType: 'foundation', library: LIBRARY, equipment: [] };

function byId(id: string): Exercise {
  return LIBRARY.find(item => item.id === id) as Exercise;
}

function emptySession(): Session {
  return emptySessionsFor('full-body', 3)[0];
}

function withExercises(...ids: [string, Row['slot']][]): Session {
  return ids.reduce((session, [id, slot]) => sessionEdits(session, CONTEXT).add(byId(id), { slot }), emptySession());
}

function layout(session: Session): string[] {
  return session.rows.map(row => `${positionLabel(session, row)}:${row.exerciseId}`);
}

function rowOf(session: Session, exerciseId: string): Row {
  return session.rows.find(row => row.exerciseId === exerciseId) as Row;
}

describe('sessionEdits', () => {
  it('adds an exercise with block defaults, cues and substitutions', () => {
    // arrange
    const session = emptySession();

    // act
    const next = sessionEdits(session, CONTEXT).add(byId('curl'), { slot: 'C' });

    // assert
    const [row] = next.rows;
    expect(row).toMatchObject({ slot: 'C', exerciseId: 'curl', cues: 'curl cues', restSeconds: 75 });
    expect(row.sets).toHaveLength(3);
    expect(row.substitutions).toEqual(['raise', 'kickback']);
  });

  it('sends a second exercise for a one-card slot to the next group', () => {
    // arrange
    const session = withExercises(['squat', 'A']);

    // act
    const next = sessionEdits(session, CONTEXT).add(byId('hinge'), { slot: 'A' });

    // assert
    expect(layout(next)).toEqual(['A:squat', 'B:hinge']);
  });

  it('keeps rows in slot order whatever the order of adding', () => {
    // arrange / act
    const session = withExercises(['plank', 'D'], ['curl', 'C'], ['squat', 'A']);

    // assert
    expect(layout(session)).toEqual(['A:squat', 'C:curl', 'D:plank']);
  });

  it('inserts before a given card of the group', () => {
    // arrange
    const session = withExercises(['curl', 'C'], ['raise', 'C']);

    // act
    const next = sessionEdits(session, CONTEXT).add(byId('kickback'), { slot: 'C', beforeRowId: rowOf(session, 'raise').id });

    // assert
    expect(layout(next)).toEqual(['C:curl', 'C:kickback', 'C:raise']);
  });

  it('forms a superset when a card lands on another accessory and labels them C1 and C2', () => {
    // arrange
    const session = withExercises(['curl', 'C'], ['plank', 'D'], ['raise', 'C']);

    // act
    const next = sessionEdits(session, CONTEXT).supersetOnto(rowOf(session, 'plank').id, rowOf(session, 'curl').id);

    // assert
    expect(layout(next)).toEqual(['C1:curl', 'C2:plank', 'C:raise']);
  });

  it('joins a library exercise dropped on an accessory to its superset', () => {
    // arrange
    const session = withExercises(['curl', 'C']);

    // act
    const next = sessionEdits(session, CONTEXT).addOnto(byId('raise'), rowOf(session, 'curl').id);

    // assert
    expect(layout(next)).toEqual(['C1:curl', 'C2:raise']);
  });

  it('swaps the main lift and the secondary with their slots', () => {
    // arrange
    const session = withExercises(['squat', 'A'], ['hinge', 'B']);

    // act
    const next = sessionEdits(session, CONTEXT).swap(rowOf(session, 'hinge').id, rowOf(session, 'squat').id);

    // assert
    expect(layout(next)).toEqual(['A:hinge', 'B:squat']);
    expect(rowOf(next, 'hinge').sets).toHaveLength(3);
  });

  it('moves a card out of a superset and dissolves a group of one', () => {
    // arrange
    const grouped = sessionEdits(withExercises(['curl', 'C'], ['raise', 'C']), CONTEXT);
    const session = grouped.supersetWithNext(grouped.session.rows[0].id);

    // act
    const next = sessionEdits(session, CONTEXT).move(rowOf(session, 'raise').id, { slot: 'D' });

    // assert
    expect(layout(next)).toEqual(['C:curl', 'D:raise']);
    expect(next.rows.every(row => row.supersetGroup === undefined)).toBe(true);
  });

  it('moves up across groups by trading places', () => {
    // arrange
    const session = withExercises(['squat', 'A'], ['curl', 'C']);

    // act
    const next = sessionEdits(session, CONTEXT).moveUp(rowOf(session, 'curl').id);

    // assert
    expect(layout(next)).toEqual(['A:curl', 'C:squat']);
  });

  it('ungroups a superset', () => {
    // arrange
    const edits = sessionEdits(withExercises(['curl', 'C'], ['raise', 'C']), CONTEXT);
    const session = edits.supersetWithNext(edits.session.rows[0].id);

    // act
    const next = sessionEdits(session, CONTEXT).ungroup(session.rows[0].supersetGroup as string);

    // assert
    expect(layout(next)).toEqual(['C:curl', 'C:raise']);
  });

  it('groups consecutive superset members into one unit', () => {
    // arrange
    const edits = sessionEdits(withExercises(['curl', 'C'], ['raise', 'C'], ['kickback', 'C']), CONTEXT);
    const session = edits.supersetWithNext(edits.session.rows[0].id);

    // act
    const units = slotUnits(session, 'C');

    // assert
    expect(units.map(unit => unit.rows.map(row => row.exerciseId))).toEqual([['curl', 'raise'], ['kickback']]);
  });

  it('keeps the sets of a row moved to another group in a deload block', () => {
    // arrange
    const deload: SessionEditContext = { ...CONTEXT, blockType: 'deload' };
    const added = sessionEdits(emptySession(), deload).add(byId('curl'), { slot: 'C' });
    const sets: Row['sets'] = [
      { kind: 'warm-up', reps: { min: 8, max: 8 } },
      { kind: 'working', reps: { min: 10, max: 12 }, rir: { min: 4, max: 4 }, weightKg: 17 },
      { kind: 'working', reps: { min: 10, max: 12 }, rir: { min: 4, max: 4 }, weightKg: 17 },
    ];
    const session = sessionEdits(added, deload).replaceRow({ ...added.rows[0], sets });

    // act
    const moved = sessionEdits(session, deload).move(session.rows[0].id, { slot: 'D' });
    const swapped = sessionEdits(sessionEdits(moved, deload).add(byId('squat'), { slot: 'A' }), deload).moveUp(moved.rows[0].id);

    // assert
    expect(layout(moved)).toEqual(['D:curl']);
    expect(rowOf(moved, 'curl').sets).toEqual(sets);
    expect(rowOf(swapped, 'curl').slot).toBe('A');
    expect(rowOf(swapped, 'curl').sets).toEqual(sets);
  });

  it('adds and removes substitutions', () => {
    // arrange
    const session = withExercises(['curl', 'C']);
    const rowId = session.rows[0].id;

    // act
    const next = sessionEdits(session, CONTEXT).removeSubstitution(rowId, 'raise');

    // assert
    expect(next.rows[0].substitutions).toEqual(['kickback']);
  });

  it('adds warm-up exercises as one set of reps or seconds, changes and removes them', () => {
    // arrange
    const session = emptySession();

    // act
    const withHips = sessionEdits(session, CONTEXT).addWarmUpItem('hips');
    const withCatCow = sessionEdits(withHips, CONTEXT).addWarmUpItem('catCow');
    const twice = sessionEdits(withCatCow, CONTEXT).addWarmUpItem('hips');
    const [hips, catCow] = withCatCow.warmUp.items;
    const changed = sessionEdits(withCatCow, CONTEXT).changeWarmUpItem({ ...hips, sets: 2 });
    const removed = sessionEdits(changed, CONTEXT).removeWarmUpItem(catCow.id);

    // assert
    expect(session.warmUp.items).toEqual([]);
    expect([hips, catCow]).toEqual([
      { id: expect.any(String), exerciseId: 'hips', sets: 1, reps: { min: 10, max: 10 } },
      { id: expect.any(String), exerciseId: 'catCow', sets: 1, seconds: 45 },
    ]);
    expect(twice).toEqual(withCatCow);
    expect(removed.warmUp.items).toEqual([{ ...hips, sets: 2 }]);
  });
});

describe('quickAddSlot', () => {
  const block = newBlock('foundation', 4, {
    setup: {
      goal: 'Lose fat',
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
      cycleMode: 'general',
      language: 'en',
      dailySteps: 6000,
      equipment: [],
      splitShape: 'full-body',
    },
    library: [],
  });

  it('picks the first open group whose plan matches the pattern', () => {
    // arrange
    const [session] = block.sessions;

    // act / assert
    expect(quickAddSlot(block, session, byId('squat'))).toBe('A');
    expect(quickAddSlot(block, session, byId('hinge'))).toBe('B');
    expect(quickAddSlot(block, session, byId('plank'))).toBe('D');
  });

  it('falls back to the accessories', () => {
    // arrange
    const session = { ...block.sessions[0], rows: withExercises(['squat', 'A']).rows };

    // act / assert
    expect(quickAddSlot(block, session, byId('squat'))).toBe('C');
  });
});
