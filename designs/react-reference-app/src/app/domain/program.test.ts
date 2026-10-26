import { describe, expect, it } from 'vitest';
import { row as fixtureRow, session as fixtureSession } from '../../test/programFixtures';
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
  scheduledSessions,
  sessionOn,
  newId,
  positionLabel,
  roleForSlot,
  isWorkingSet,
  setsSummary,
  warmUpItemText,
  workingSets,
  type Program,
  type ProgramContent,
  type ProgramVersion,
  type Row,
  type Session,
  type SetSpec,
  type VersionState,
} from './program';

const STEADY_SET = { kind: 'working' as const, reps: { min: 8, max: 10 }, rir: { min: 1, max: 2 } };

function row(slot: Row['slot'], supersetGroup?: string): Row {
  return fixtureRow({ id: newId(), exerciseId: 'exercise-1', slot, supersetGroup, sets: [STEADY_SET, STEADY_SET, STEADY_SET], restSeconds: 90 });
}

function sessionOf(rows: Row[]): Session {
  return fixtureSession({ id: 'session-1', name: 'Lower A', rows });
}

const emptyContent: ProgramContent = {
  header: { title: '', focus: '', personalNote: '' },
  plan: { blocks: [] },
  cycleRules: [],
  nutritionNotes: '',
  lifestyleNotes: '',
};

function version(number: number, state: VersionState): ProgramVersion {
  return { number, state, publishedAt: null, whatChanged: '', content: emptyContent };
}

function programWith(versions: ProgramVersion[]): Program {
  return { callId: 'call-1', goal: 'Build muscle', language: 'en', cycleMode: 'adapted', level: 'beginner', versions };
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
    cycleMode: 'adapted',
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
      cycleMode: 'general',
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

describe('setsSummary', () => {
  const set = (reps: [number, number], rir: [number, number]): SetSpec => ({
    kind: 'working',
    reps: { min: reps[0], max: reps[1] },
    rir: { min: rir[0], max: rir[1] },
  });

  it('summarises identical sets by count, reps and RIR range', () => {
    // arrange
    const sets = Array.from({ length: 4 }, () => set([6, 10], [1, 2]));

    // act
    const summary = setsSummary(sets);

    // assert
    expect(summary).toBe('4 × 6–10 · RIR 1–2');
  });

  it('shows a single RIR when its range is one value', () => {
    // arrange
    const sets = [set([8, 8], [2, 2]), set([8, 8], [2, 2]), set([8, 8], [2, 2])];

    // act
    const summary = setsSummary(sets);

    // assert
    expect(summary).toBe('3 × 8 · RIR 2');
  });

  it('counts sets when they differ', () => {
    // arrange
    const sets = [set([5, 5], [2, 2]), set([8, 10], [1, 2]), set([8, 10], [1, 2]), set([8, 10], [1, 2])];

    // act
    const summary = setsSummary(sets);

    // assert
    expect(summary).toBe('4 sets');
  });

  it('leads with the warm-up count and summarises the working sets', () => {
    // arrange
    const warmUp = (reps: number): SetSpec => ({ kind: 'warm-up', reps: { min: reps, max: reps } });
    const sets = [warmUp(8), warmUp(5), ...Array.from({ length: 4 }, () => set([6, 10], [1, 2]))];

    // act
    const summary = setsSummary(sets);

    // assert
    expect(summary).toBe('2 warm-up · 4 × 6–10 · RIR 1–2');
  });

  it('says there are no sets for an empty list', () => {
    // act
    const summary = setsSummary([]);

    // assert
    expect(summary).toBe('No sets');
  });
});

describe('workingSets', () => {
  it('keeps only the working sets, in order', () => {
    // arrange
    const warmUp: SetSpec = { kind: 'warm-up', reps: { min: 8, max: 8 }, weightKg: 20 };
    const first: SetSpec = { kind: 'working', reps: { min: 6, max: 8 }, rir: { min: 2, max: 2 }, weightKg: 40 };
    const second: SetSpec = { kind: 'working', reps: { min: 6, max: 8 }, rir: { min: 1, max: 1 } };

    // act
    const working = workingSets([warmUp, first, second]);

    // assert
    expect(working).toEqual([first, second]);
    expect([warmUp, first].map(isWorkingSet)).toEqual([false, true]);
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
    { goal: '', level: 'beginner', trainingDays: 3, sessionMinutes: 60, cycleMode: 'general', language: 'en', dailySteps: 6000, splitShape: 'full-body' },
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
