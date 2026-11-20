import { describe, expect, it } from 'vitest';
import { row as fixtureRow, session as fixtureSession, startSets } from '../../test/programFixtures';
import type { ProgramSetup } from './programOnboarding';
import { initialContent } from './programSuggestions';
import {
  cardioOn,
  contentWithFreshIds,
  currentVersion,
  draftOf,
  filledSessionCount,
  hasExercises,
  mapCalendar,
  planHasCoolDown,
  plannedSets,
  scheduledSessions,
  sessionOn,
  newId,
  positionLabel,
  roleForSlot,
  isWorkingSet,
  setsBreakdown,
  warmUpItemText,
  type Program,
  type ProgramContent,
  type ProgramVersion,
  type Row,
  type Block,
  type Session,
  type SetSpec,
  type VersionState,
} from './program';

function row(slot: Row['slot'], supersetGroup?: string): Row {
  return fixtureRow({ id: newId(), exerciseId: 'exercise-1', slot, supersetGroup, startSets: startSets({ count: 3, reps: { min: 8, max: 10 }, rir: 2 }), restSeconds: 90 });
}

function sessionOf(rows: Row[]): Session {
  return fixtureSession({ id: 'session-1', name: 'Lower A', rows });
}

const emptyContent: ProgramContent = {
  header: { title: '', focus: '', personalNote: '' },
  plan: { blocks: [] },
  nutritionNotes: '',
  lifestyleNotes: '',
};

function version(number: number, state: VersionState): ProgramVersion {
  return { number, state, publishedAt: null, whatChanged: '', content: emptyContent };
}

function programWith(versions: ProgramVersion[]): Program {
  return { callId: 'call-1', goal: 'Build muscle', language: 'en', level: 'beginner', versions };
}

describe('roleForSlot', () => {
  it.each([
    ['A', 'main-compound'],
    ['B', 'secondary-compound'],
    ['C', 'isolation'],
    ['D', 'isolation'],
  ] as const)('maps slot %s to %s', (slot, role) => {
    expect(roleForSlot(slot)).toBe(role);
  });
});

describe('positionLabel', () => {
  it('numbers rows of a superset in session order', () => {
    const first = row('C', 'ss-1');
    const second = row('C', 'ss-1');
    const session = sessionOf([row('A'), row('B'), first, second]);

    expect(positionLabel(session, first)).toBe('C1');
    expect(positionLabel(session, second)).toBe('C2');
  });

  it('leaves a lone row without a number', () => {
    const lone = row('C');
    const session = sessionOf([row('A'), lone]);

    expect(positionLabel(session, lone)).toBe('C');
  });

  it('labels single-row slots by letter', () => {
    const a = row('A');
    const d = row('D');
    const session = sessionOf([a, d]);

    expect(positionLabel(session, a)).toBe('A');
    expect(positionLabel(session, d)).toBe('D');
  });
});

describe('versions', () => {
  it('finds the published and the draft version', () => {
    const program = programWith([version(1, 'superseded'), version(2, 'published'), version(3, 'draft')]);

    expect(currentVersion(program)?.number).toBe(2);
    expect(draftOf(program)?.number).toBe(3);
  });

  it('returns undefined when no version has the state', () => {
    const program = programWith([version(1, 'draft')]);

    expect(currentVersion(program)).toBeUndefined();
    expect(draftOf(programWith([]))).toBeUndefined();
  });
});

describe('newId', () => {
  it('returns a distinct id on every call', () => {
    expect(newId()).not.toBe(newId());
  });
});

describe('contentWithFreshIds', () => {
  const setup: ProgramSetup = {
    goal: 'Lose fat',
    level: 'beginner',
    trainingDays: 3,
    sessionMinutes: 60,
    language: 'en',
    dailySteps: 6000,
    splitShape: 'full-body',
  };

  function contentWithRows() {
    const content = initialContent(setup, []);
    const [block, ...blocks] = content.plan.blocks;
    const sessions = block.sessions.map(session => ({ ...session, rows: [row('A')] }));
    return { ...content, plan: { blocks: [{ ...block, sessions }, ...blocks] } };
  }

  it('gives every block, session and row a new id and keeps the origin ids', () => {
    const content = contentWithRows();

    const copy = contentWithFreshIds(content);

    const [block] = content.plan.blocks;
    const [copied] = copy.plan.blocks;
    expect(copied.id).not.toBe(block.id);
    expect(copied.originId).toBe(block.originId);
    expect(copied.sessions[0].id).not.toBe(block.sessions[0].id);
    expect(copied.sessions[0].originId).toBe(block.sessions[0].originId);
    expect(copied.sessions[0].rows[0].id).not.toBe(block.sessions[0].rows[0].id);
  });

  it('points the calendar at the new session ids', () => {
    const copy = contentWithFreshIds(initialContent(setup, []));

    const [block] = copy.plan.blocks;
    const sessionIds = block.sessions.map(session => session.id);
    const calendarSessionIds = Object.values(block.calendar).flatMap(entry =>
      entry.kind === 'session' ? [entry.sessionId] : [],
    );
    expect(calendarSessionIds.sort()).toEqual(sessionIds.sort());
  });

  it('gives cardio sessions new ids, keeps their origin and points the calendar at them', () => {
    // arrange
    const content = initialContent(setup, []);

    // act
    const copy = contentWithFreshIds(content);

    // assert
    const [block] = content.plan.blocks;
    const [copied] = copy.plan.blocks;
    expect(copied.cardioSessions[0].id).not.toBe(block.cardioSessions[0].id);
    expect(copied.cardioSessions[0].originId).toBe(block.cardioSessions[0].originId);
    const calendarCardioIds = Object.values(copied.calendar).flatMap(entry => (entry.kind === 'cardio' ? [entry.cardioId] : []));
    expect(calendarCardioIds.sort()).toEqual(copied.cardioSessions.map(cardio => cardio.id).sort());
  });
});

describe('filledSessionCount', () => {
  it('counts sessions with at least one chosen exercise', () => {
    const [block] = initialContent({
      goal: '',
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
      language: 'en',
      dailySteps: 6000,
      splitShape: 'full-body',
    }, []).plan.blocks;
    const [first, ...rest] = block.sessions;
    const filled = { ...first, rows: [row('A')] };
    expect(filledSessionCount(block)).toBe(0);
    expect(filledSessionCount({ ...block, sessions: [filled, ...rest] })).toBe(1);
  });
});

describe('setsBreakdown', () => {
  const set = (reps: [number, number], rir: number, weightKg?: number): SetSpec => ({
    kind: 'working',
    reps: { min: reps[0], max: reps[1] },
    rir,
    ...(weightKg === undefined ? {} : { weightKg }),
  });

  it('reads sets that differ only in RIR as one kind of set, with the lowest to highest RIR', () => {
    // arrange
    const warmUp: SetSpec = { kind: 'warm-up', reps: { min: 8, max: 8 } };
    const sets = [warmUp, set([6, 10], 2), set([6, 10], 2), set([6, 10], 1)];

    // act
    const breakdown = setsBreakdown(sets, ' s');

    // assert
    expect(breakdown).toEqual({ warmUp: 1, working: 3, reps: '6–10 s', rir: { min: 1, max: 2 } });
  });

  it('gives no reps for working sets that differ in reps or in weight', () => {
    // arrange
    const byReps = [set([5, 5], 2), set([8, 10], 2)];
    const byWeight = [set([8, 10], 2, 60), set([8, 10], 2, 50)];

    // act
    const breakdowns = [setsBreakdown(byReps), setsBreakdown(byWeight)];

    // assert
    expect(breakdowns.map(breakdown => breakdown.reps)).toEqual([null, null]);
  });

  it('tells a working set from a warm-up set', () => {
    // arrange
    const warmUp: SetSpec = { kind: 'warm-up', reps: { min: 8, max: 8 }, weightKg: 20 };

    // act
    const answers = [warmUp, set([6, 8], 2)].map(isWorkingSet);

    // assert
    expect(answers).toEqual([false, true]);
  });
});

describe('warmUpItemText', () => {
  it('reads the sets and the reps or seconds of a warm-up exercise', () => {
    // act
    const timed = warmUpItemText({ id: 'w1', exerciseId: 'e', sets: 1, seconds: 45 });
    const counted = warmUpItemText({ id: 'w2', exerciseId: 'e', sets: 2, reps: { min: 8, max: 10 } });

    // assert
    expect([timed, counted]).toEqual(['1 × 45 s', '2 × 8–10']);
  });
});

describe('calendar lookups', () => {
  const content = initialContent(
    { goal: '', level: 'beginner', trainingDays: 3, sessionMinutes: 60, language: 'en', dailySteps: 6000, splitShape: 'full-body' },
    [],
  );
  const [block] = content.plan.blocks;
  const cardio = { id: 'cardio', originId: 'cardio', name: 'Easy cardio', segments: [] };
  const withCardio = { ...block, cardioSessions: [cardio], calendar: { ...block.calendar, tue: { kind: 'cardio' as const, cardioId: 'cardio' } } };

  it('finds the session or cardio placed on a day', () => {
    // act
    const monday = sessionOn(withCardio, 'mon');
    const tuesday = cardioOn(withCardio, 'tue');

    // assert
    expect(monday).toBe(block.sessions[0]);
    expect(sessionOn(withCardio, 'tue')).toBeUndefined();
    expect(tuesday).toBe(cardio);
    expect(cardioOn(withCardio, 'mon')).toBeUndefined();
    expect(sessionOn(withCardio, 'sun')).toBeUndefined();
  });

  it('lists the sessions the calendar schedules, leaving out unplaced ones', () => {
    // arrange
    const unplaced = { ...withCardio, calendar: { ...withCardio.calendar, fri: { kind: 'rest' as const } } };

    // act
    const scheduled = scheduledSessions(unplaced);

    // assert
    expect(scheduled).toEqual(block.sessions.slice(0, 2));
  });

  it('builds a whole calendar from one entry per day', () => {
    // act
    const calendar = mapCalendar(day => (day === 'wed' ? { kind: 'cardio', cardioId: 'cardio' } : { kind: 'rest' }));

    // assert
    expect(Object.keys(calendar)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    expect(calendar.wed).toEqual({ kind: 'cardio', cardioId: 'cardio' });
    expect(calendar.mon).toEqual({ kind: 'rest' });
  });
});

describe('hasExercises', () => {
  it('needs at least one row with a chosen exercise', () => {
    // arrange
    const empty = sessionOf([{ ...row('A'), exerciseId: '' }]);
    const filled = sessionOf([{ ...row('A'), exerciseId: '' }, row('B')]);

    // act
    const results = [hasExercises(sessionOf([])), hasExercises(empty), hasExercises(filled)];

    // assert
    expect(results).toEqual([false, false, true]);
  });
});

describe('plannedSets', () => {
  it('plans the warm-up sets first, then one working set per counted set, each with its own id and the last at its own RIR', () => {
    // act
    const sets = plannedSets([{ reps: { min: 8, max: 8 }, rir: 3 }], { count: 3, reps: { min: 6, max: 10 }, rir: 3, lastSetRir: 2 });

    // assert
    expect(sets.map(set => [set.kind, set.start.reps.min, set.start.rir])).toEqual([
      ['warm-up', 8, 3],
      ['working', 6, 3],
      ['working', 6, 3],
      ['working', 6, 2],
    ]);
    expect(new Set(sets.map(set => set.id)).size).toBe(4);
  });

  it('starts a single working set at the last set’s RIR', () => {
    // act
    const sets = plannedSets([], { count: 1, reps: { min: 6, max: 10 }, rir: 3, lastSetRir: 2 });

    // assert
    expect(sets.map(set => set.start.rir)).toEqual([2]);
  });
});

describe('planHasCoolDown', () => {
  it('finds a cool-down only where a session turns it on and gives it an exercise', () => {
    // arrange
    const on = fixtureSession({ coolDown: { enabled: true, items: [{ id: 'cd', exerciseId: 'stretch', seconds: 30 }] } });
    const empty = fixtureSession({ coolDown: { enabled: true, items: [] } });
    const blockWith = (sessions: Session[]) => ({ sessions }) as Block;

    // act
    const withOne = planHasCoolDown([blockWith([empty]), blockWith([on])]);

    // assert
    expect(withOne).toBe(true);
    expect(planHasCoolDown([blockWith([empty, fixtureSession()])])).toBe(false);
  });
});
