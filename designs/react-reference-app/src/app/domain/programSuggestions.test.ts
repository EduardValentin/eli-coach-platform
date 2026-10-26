import { describe, expect, it } from 'vitest';
import { equippedExercise, row, workingSets } from '../../test/programFixtures';
import type { Block, CardioSession, SetSpec } from './program';
import type { ProgramSetup } from './programOnboarding';
import {
  emptyRow,
  emptySessionsFor,
  initialContent,
  newBlock,
  splitShapeFor,
  spreadCalendar,
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
  splitShape: 'full-body',
};

function cardio(id: string): CardioSession {
  return { id, originId: id, name: 'Easy cardio', segments: [] };
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

describe('emptyRow', () => {
  it('puts two warm-up sets before the working sets of a main compound row', () => {
    // act
    const { sets } = emptyRow('hypertrophy', 'A');

    // assert
    expect(sets.slice(0, 2)).toEqual([
      { kind: 'warm-up', reps: { min: 8, max: 8 } },
      { kind: 'warm-up', reps: { min: 5, max: 5 } },
    ]);
    expect(sets.slice(2)).toEqual(Array.from({ length: 4 }, () => ({ kind: 'working', reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } })));
  });

  it('gives other rows working sets only', () => {
    // act
    const { sets } = emptyRow('hypertrophy', 'B');

    // assert
    expect(sets.every(set => set.kind === 'working')).toBe(true);
  });
});

describe('newBlock and initialContent', () => {
  const library = [equippedExercise('bike', ['Bike'], { name: 'Stationary bike', type: 'cardio', measuredIn: 'time' })];

  function previousBlock() {
    const built = newBlock('hypertrophy', 6, { setup: SETUP, library });
    const [first, ...others] = built.sessions;
    const sets: SetSpec[] = [
      { kind: 'warm-up', reps: { min: 8, max: 8 } },
      ...workingSets(4).map((set, index) => ({ ...set, ...(index === 0 ? { weightKg: 50 } : {}) })),
    ];
    return { ...built, sessions: [{ ...first, rows: [row({ sets })] }, ...others] };
  }

  it('prefills a deload from the previous block with half the working sets at RIR 4 and lighter weights', () => {
    // arrange
    const previous = previousBlock();

    // act
    const deload = newBlock('deload', 1, { setup: SETUP, library, previous });

    // assert
    expect(deload.sessions[0].rows[0].sets).toEqual([
      { kind: 'warm-up', reps: { min: 8, max: 8 } },
      { kind: 'working', reps: { min: 8, max: 12 }, rir: { min: 4, max: 4 }, weightKg: 42.5 },
      { kind: 'working', reps: { min: 8, max: 12 }, rir: { min: 4, max: 4 } },
    ]);
    expect(deload.sessions[0].id).not.toBe(previous.sessions[0].id);
    expect(deload.sessions[0].originId).toBe(previous.sessions[0].originId);
    expect(deload.originId).not.toBe(previous.originId);
    expect(deload.split).toEqual(previous.split);
  });

  it('keeps the calendar and cardio of the previous block in a deload, under new ids', () => {
    // arrange
    const previous = previousBlock();

    // act
    const deload = newBlock('deload', 1, { setup: SETUP, library, previous });

    // assert
    expect(deload.cardioSessions.map(cardio => cardio.name)).toEqual(previous.cardioSessions.map(cardio => cardio.name));
    expect(deload.cardioSessions[0].id).not.toBe(previous.cardioSessions[0].id);
    const kinds = (block: Block) => Object.values(block.calendar).map(entry => entry.kind);
    expect(kinds(deload)).toEqual(kinds(previous));
    const deloadIds = Object.values(deload.calendar).flatMap(entry => (entry.kind === 'cardio' ? [entry.cardioId] : []));
    expect(deloadIds.sort()).toEqual(deload.cardioSessions.map(cardio => cardio.id).sort());
  });

  it('places default cardio from the library in a fresh block', () => {
    // act
    const block = newBlock('hypertrophy', 6, { setup: SETUP, library });

    // assert
    expect(block.cardioSessions.map(cardio => cardio.name)).toEqual(['Easy cardio', 'Easy cardio', 'Moderate cardio']);
    expect(block.cardioSessions[0].segments[0]).toMatchObject({ kind: 'steady', exerciseId: 'bike' });
  });

  it('fills texts and settings from the setup', () => {
    // act
    const block = newBlock('foundation', 4, { setup: { ...SETUP, sessionMinutes: 45, dailySteps: 7000 }, library: [] });

    // assert
    expect(block).toMatchObject({ weeks: 4, targetMinutes: 45, dailySteps: 7000, calibrationWeek: false });
    expect(block.split.shape).toBe('full-body');
    expect(block.split.text).toContain('3x per week');
    expect(block.introText).toContain('Foundation block');
    expect(block.missedDayNote).not.toBe('');
  });

  it('builds a beginner plan of three blocks with empty Full Body sessions', () => {
    // act
    const content = initialContent(SETUP, []);

    // assert
    expect(content.header.title).toBe('Program — weeks 1–2');
    expect(content.plan.blocks.map(b => b.type)).toEqual(['foundation', 'hypertrophy', 'deload']);
    expect(content.plan.blocks[0].sessions.map(s => s.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C']);
    expect(content.plan.blocks.every(b => b.sessions.every(s => s.rows.length === 0))).toBe(true);
    expect(content.plan.blocks.map(b => b.trainingDays)).toEqual([3, 3, 3]);
  });

  it('starts every session with an empty warm-up and the cool-down off', () => {
    // act
    const [session] = initialContent(SETUP, []).plan.blocks[0].sessions;

    // assert
    expect(session.warmUp).toEqual({ items: [] });
    expect(session.coolDown).toEqual({ enabled: false, note: '', items: [] });
  });

  it('builds the sessions of the chosen split rather than the one the days suggest', () => {
    // act
    const content = initialContent({ ...SETUP, trainingDays: 4, splitShape: 'full-body' }, []);

    // assert
    expect(content.plan.blocks[0].split.shape).toBe('full-body');
    expect(content.plan.blocks[0].sessions.map(s => s.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D']);
    expect(content.plan.blocks.map(b => b.trainingDays)).toEqual([4, 4, 4]);
  });

  it('sets the calibration week from the suggestion', () => {
    // act
    const content = initialContent({ ...SETUP, level: 'intermediate' }, []);

    // assert
    expect(content.plan.blocks.map(b => b.calibrationWeek)).toEqual([true, false, false]);
  });
});
