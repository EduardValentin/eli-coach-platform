import { describe, expect, it } from 'vitest';
import { equippedExercise, row } from '../../test/programFixtures';
import type { Block, CardioSession, PlannedSet } from './program';
import type { ProgramSetup } from './programOnboarding';
import { warnings, type RuleContext } from './programRules';
import { withSetAdded, withTypedTargets } from './programProgression';
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
        { type: 'deload', weeks: 1, calibrationWeek: false },
        { type: 'strength', weeks: 4, calibrationWeek: false },
        { type: 'deload', weeks: 1, calibrationWeek: false },
      ],
    ]);
  });

  it.each(['beginner', 'intermediate', 'advanced'] as const)('suggests a %s plan that stays within its loading weeks without a Deload', level => {
    // arrange
    const content = initialContent({ ...SETUP, level }, []);
    const context: RuleContext = {
      publishDay: new Date(2026, 0, 5),
      dayOne: null,
      preferredWeekday: 'mon',
      level,
      startDate: null,
      detailsPending: false,
      publishedBlocks: null,
      exercisesById: new Map(),
    };

    // act
    const found = warnings(content, context);

    // assert
    expect(found.map(finding => finding.code)).not.toContain('loading-weeks-without-deload');
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
    const { startSets } = emptyRow('hypertrophy', 'A');

    // assert
    const working = { kind: 'working', start: { reps: { min: 6, max: 10 }, rir: 3 } };
    expect(startSets.map(({ kind, start }) => ({ kind, start }))).toEqual([
      { kind: 'warm-up', start: { reps: { min: 8, max: 8 }, rir: 3 } },
      { kind: 'warm-up', start: { reps: { min: 5, max: 5 }, rir: 3 } },
      working,
      working,
      working,
      { kind: 'working', start: { reps: { min: 6, max: 10 }, rir: 2 } },
    ]);
  });

  it('gives other rows working sets only', () => {
    // act
    const { startSets } = emptyRow('hypertrophy', 'B');

    // assert
    expect(startSets.map(set => set.kind)).toEqual(['working', 'working', 'working']);
  });
});

describe('newBlock and initialContent', () => {
  const library = [equippedExercise('bike', ['Bike'], { name: 'Stationary bike', type: 'cardio', measuredIn: 'time' })];

  function previousBlock() {
    const built = newBlock('hypertrophy', 6, { setup: SETUP, library });
    const [first, ...others] = built.sessions;
    const targets = { reps: { min: 8, max: 12 }, rir: 2 };
    const startSets: PlannedSet[] = [
      { id: 'warm-up', kind: 'warm-up', start: { reps: { min: 8, max: 8 }, rir: 2 } },
      { id: 'top', kind: 'working', start: { ...targets, weightKg: 50 } },
      ...['back-off-1', 'back-off-2', 'back-off-3'].map((id): PlannedSet => ({ id, kind: 'working', start: targets })),
    ];
    return { ...built, sessions: [{ ...first, rows: [row({ startSets })] }, ...others] };
  }

  it('prefills a deload from the last week of the previous block with its warm-up sets and half its working sets at RIR 4 and lighter weights', () => {
    // arrange
    const previous = previousBlock();

    // act
    const deload = newBlock('deload', 1, { setup: SETUP, library, previous });

    // assert
    const [deloaded] = deload.sessions[0].rows;
    expect(deloaded.startSets.map(({ kind, start }) => ({ kind, start }))).toEqual([
      { kind: 'warm-up', start: { reps: { min: 8, max: 8 }, rir: 2 } },
      { kind: 'working', start: { reps: { min: 11, max: 12 }, rir: 4, weightKg: 45 } },
      { kind: 'working', start: { reps: { min: 12, max: 12 }, rir: 4 } },
    ]);
    expect(deload.sessions[0].id).not.toBe(previous.sessions[0].id);
    expect(deload.sessions[0].originId).toBe(previous.sessions[0].originId);
    expect(deload.originId).not.toBe(previous.originId);
    expect(deload.split).toEqual(previous.split);
  });

  it('starts a new loading block from the first week of the previous one, without its later weeks', () => {
    // arrange
    const built = previousBlock();
    const [first, ...others] = built.sessions;
    const context = { block: built, level: SETUP.level };
    const typed = withTypedTargets(withSetAdded(first.rows[0], 4, context), { week: 3, setId: 'top' }, { weightKg: 60 });
    const previous = { ...built, sessions: [{ ...first, rows: [typed] }, ...others] };

    // act
    const next = newBlock('strength', 4, { setup: SETUP, library, previous });

    // assert
    expect(next.sessions[0].rows[0].startSets.map(set => set.id)).toEqual(['warm-up', 'top', 'back-off-1', 'back-off-2', 'back-off-3']);
    expect(next.sessions[0].rows[0]).not.toHaveProperty('weekChanges');
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
    expect(block.introText).toContain('Building your base');
    expect(block.missedDayNote).not.toBe('');
  });

  it('builds a beginner plan of three blocks with empty Full Body sessions', () => {
    // act
    const content = initialContent(SETUP, []);

    // assert
    expect(content.header.title).toBe('');
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
    expect(session.coolDown).toEqual({ enabled: false, items: [] });
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
