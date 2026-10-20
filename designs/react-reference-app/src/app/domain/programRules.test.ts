import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { Block, BlockType, CalendarEntry, CardioType, Row, Session, Slot, Weekday } from './program';
import {
  blockShorterThanElapsed,
  blockingMessage,
  blockingProblems,
  isHeavyLegSession,
  minimumContentWindow,
  warningMessage,
  warnings,
  type RuleContext,
} from './programRules';

const publishDay = new Date(2026, 9, 20);

const exercise = (id: string, primaryMuscles: Exercise['primaryMuscles'], role?: Exercise['role']) =>
  ({ id, name: `Exercise ${id}`, primaryMuscles, role }) as Exercise;

const exercises = new Map(
  [
    exercise('squat', ['Quadriceps', 'Glutes'], 'main-compound'),
    exercise('hipThrust', ['Glutes']),
    exercise('bench', ['Chest']),
    exercise('row', ['Upper back']),
    exercise('curl', ['Biceps']),
    exercise('fly', ['Chest']),
  ].map(entry => [entry.id, entry]),
);

const context = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  versionNumber: 1,
  publishDay,
  dayOne: publishDay,
  preferredWeekday: 'mon',
  level: 'intermediate',
  startDate: null,
  detailsPending: false,
  exercisesById: exercises,
  ...overrides,
});

const row = (exerciseId: string, slot: Slot = 'A', supersetGroup?: string) =>
  ({ id: `${exerciseId}-${slot}`, exerciseId, slot, supersetGroup, sets: 3, restSeconds: 90 }) as Row;

const session = (id: string, rows: Row[] = [row('bench')], name = id): Session =>
  ({ id, name, rows, coolDown: false }) as Session;

type Spec = {
  type?: BlockType;
  weeks?: number;
  sessions?: Session[];
  days?: Partial<Record<Weekday, string | CardioType>>;
  cardio?: Partial<Record<Weekday, CardioType>>;
  targetMinutes?: number;
};

const WEEK: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const blocks = (...specs: Spec[]): Block[] =>
  specs.map((spec, index) => {
    const sessions = spec.sessions ?? [session('s1')];
    const calendar = Object.fromEntries(
      WEEK.map((day): [Weekday, CalendarEntry] => {
        const sessionId = spec.days?.[day];
        if (sessionId) return [day, { kind: 'session', sessionId }];
        if (spec.cardio?.[day]) return [day, { kind: 'cardio', cardioId: `${day}-cardio` }];
        return [day, { kind: 'rest' }];
      }),
    ) as Block['calendar'];
    return {
      id: `b${index + 1}`,
      type: spec.type ?? 'hypertrophy',
      weeks: spec.weeks ?? 4,
      targetMinutes: spec.targetMinutes ?? 60,
      calendar,
      sessions,
      cardioSessions: Object.entries(spec.cardio ?? {}).map(([weekday, type]) => ({
        id: `${weekday}-cardio`,
        type,
        weekday,
        minutes: 20,
      })),
    } as Block;
  });

const content = (planBlocks: Block[]) => ({ plan: { blocks: planBlocks } }) as Parameters<typeof warnings>[0];

const codes = (findings: { code: string }[]) => findings.map(finding => finding.code);

describe('blockingProblems sequence', () => {
  it('requires Foundation to come first', () => {
    const found = blockingProblems(content(blocks({ type: 'hypertrophy' }, { type: 'foundation' })), 'x', context());
    expect(codes(found)).toContain('foundation-not-first');
  });

  it('refuses a plan that starts with a Deload', () => {
    const found = blockingProblems(content(blocks({ type: 'deload', weeks: 1 })), 'x', context());
    expect(codes(found)).toContain('starts-with-deload');
  });

  it('refuses consecutive Deloads', () => {
    const found = blockingProblems(
      content(blocks({ type: 'foundation' }, { type: 'deload', weeks: 1 }, { type: 'deload', weeks: 1 })),
      'x',
      context(),
    );
    expect(codes(found)).toContain('consecutive-deloads');
  });

  it('refuses a Deload that is not one week, naming the block', () => {
    const found = blockingProblems(content(blocks({ type: 'foundation' }, { type: 'deload', weeks: 2 })), 'x', context());
    expect(found).toContainEqual({ code: 'deload-not-one-week', blockId: 'b2' });
  });

  it('accepts a well-formed sequence', () => {
    const found = blockingProblems(content(blocks({ type: 'foundation' }, { type: 'deload', weeks: 1 })), 'x', context());
    expect(found).toEqual([]);
  });
});

describe('minimumContentWindow', () => {
  it('runs from the publish day to the later of the next check-in and two weeks', () => {
    const window = minimumContentWindow(context({ preferredWeekday: 'mon' }));
    expect(window.from).toEqual(publishDay);
    expect(window.to).toEqual(new Date(2026, 10, 9));
  });

  it('uses two weeks when the next check-in is sooner', () => {
    const window = minimumContentWindow(context({ dayOne: addDays(publishDay, -13), preferredWeekday: 'wed' }));
    expect(window.to).toEqual(addDays(publishDay, 14));
  });
});

describe('missing-sessions', () => {
  const emptySession = session('s1', [row('')]);

  it('flags a block inside the window whose sessions have no exercises', () => {
    const planBlocks = blocks({ type: 'foundation', weeks: 2, sessions: [emptySession], days: { mon: 's1' } });
    const found = blockingProblems(content(planBlocks), 'x', context());
    expect(found).toContainEqual({ code: 'missing-sessions', blockId: 'b1', detail: 'Foundation block 1' });
  });

  it('passes when the rows carry exercises', () => {
    const planBlocks = blocks({ type: 'foundation', weeks: 2, days: { mon: 's1' } });
    expect(codes(blockingProblems(content(planBlocks), 'x', context()))).not.toContain('missing-sessions');
  });

  it('ignores an empty block that starts after the window', () => {
    const planBlocks = blocks(
      { type: 'foundation', weeks: 2, days: { mon: 's1' } },
      { weeks: 2, days: { mon: 's1' } },
      { weeks: 4, sessions: [emptySession], days: { mon: 's1' } },
    );
    expect(codes(blockingProblems(content(planBlocks), 'x', context()))).not.toContain('missing-sessions');
  });

  it('measures the window from the publish day when day 1 is not set', () => {
    const planBlocks = blocks({ type: 'foundation', weeks: 2, sessions: [emptySession], days: { mon: 's1' } });
    const found = blockingProblems(content(planBlocks), 'x', context({ dayOne: null }));
    expect(codes(found)).toContain('missing-sessions');
  });
});

describe('blockShorterThanElapsed', () => {
  const dayOne = addDays(publishDay, -35);

  it('flags a block cut shorter than the weeks already run', () => {
    const found = blockShorterThanElapsed(blocks({ weeks: 3 }), dayOne, publishDay);
    expect(found).toEqual([{ code: 'block-shorter-than-elapsed', blockId: 'b1', detail: '5' }]);
  });

  it('flags a block that would cut the running week', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 5 }), dayOne, publishDay)).toHaveLength(1);
  });

  it('passes when the block covers the running week', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 6 }), dayOne, publishDay)).toEqual([]);
  });

  it('passes without a day 1', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 1 }), null, publishDay)).toEqual([]);
  });

  it('is part of the blocking problems', () => {
    const found = blockingProblems(content(blocks({ type: 'foundation', weeks: 3 })), 'x', context({ dayOne }));
    expect(codes(found)).toContain('block-shorter-than-elapsed');
  });
});

describe('blockingProblems context rules', () => {
  const planBlocks = content(blocks({ type: 'foundation', days: { mon: 's1' } }));

  it('asks what changed from version 2', () => {
    expect(codes(blockingProblems(planBlocks, '  ', context({ versionNumber: 2 })))).toContain('what-changed-missing');
    expect(codes(blockingProblems(planBlocks, '  ', context({ versionNumber: 1 })))).not.toContain('what-changed-missing');
    expect(codes(blockingProblems(planBlocks, 'More volume', context({ versionNumber: 2 })))).not.toContain(
      'what-changed-missing',
    );
  });

  it('holds publishing until the start date', () => {
    const found = blockingProblems(planBlocks, 'x', context({ startDate: new Date(2026, 10, 2) }));
    expect(found).toContainEqual({ code: 'start-date-not-reached', detail: '2 November' });
    expect(codes(blockingProblems(planBlocks, 'x', context({ startDate: publishDay })))).not.toContain(
      'start-date-not-reached',
    );
  });

  it('holds publishing while a details request is pending', () => {
    expect(codes(blockingProblems(planBlocks, 'x', context({ detailsPending: true })))).toContain('details-pending');
  });
});

describe('warnings', () => {
  const found = (planBlocks: Block[], overrides: Partial<RuleContext> = {}) =>
    warnings(content(planBlocks), context(overrides));

  it('warns after more than 8 weeks without a Deload', () => {
    expect(codes(found(blocks({ weeks: 6 }, { weeks: 3 })))).toContain('no-deload-8-weeks');
    expect(codes(found(blocks({ weeks: 6 }, { type: 'deload', weeks: 1 }, { weeks: 6 })))).not.toContain(
      'no-deload-8-weeks',
    );
  });

  it('warns about strength for a beginner', () => {
    const planBlocks = blocks({ type: 'strength' });
    expect(codes(found(planBlocks, { level: 'beginner' }))).toContain('strength-for-beginner');
    expect(codes(found(planBlocks))).not.toContain('strength-for-beginner');
  });

  it('warns about a large muscle group trained once', () => {
    const planBlocks = blocks({
      sessions: [session('s1', [row('bench'), row('curl', 'C')]), session('s2', [row('row')]), session('s3', [row('row')])],
      days: { mon: 's1', wed: 's2', fri: 's3' },
    });
    const result = found(planBlocks).filter(finding => finding.code === 'muscle-under-twice');
    expect(result).toEqual([{ code: 'muscle-under-twice', blockId: 'b1', detail: 'Chest' }]);
  });

  it('does not warn about a group trained on two days', () => {
    const planBlocks = blocks({
      sessions: [session('s1', [row('bench')]), session('s2', [row('fly')])],
      days: { mon: 's1', thu: 's2' },
    });
    expect(codes(found(planBlocks))).not.toContain('muscle-under-twice');
  });

  it('warns about two hard days in a row without rest or LISS', () => {
    const planBlocks = blocks({
      sessions: [session('s1'), session('s2')],
      days: { mon: 's1', tue: 's2' },
      cardio: { wed: 'liss' },
    });
    const result = found(planBlocks).filter(finding => finding.code === 'hard-days-in-a-row');
    expect(result).toEqual([{ code: 'hard-days-in-a-row', blockId: 'b1', detail: 'Mon and Tue' }]);
  });

  it('does not warn when the day between is LISS', () => {
    const planBlocks = blocks({
      sessions: [session('s1'), session('s2')],
      days: { mon: 's1', wed: 's2' },
      cardio: { tue: 'liss' },
    });
    expect(codes(found(planBlocks))).not.toContain('hard-days-in-a-row');
  });

  it('warns about HIIT the day before heavy legs', () => {
    const legs = session('Lower A', [row('hipThrust', 'A')], 'Lower A');
    const planBlocks = blocks({ sessions: [legs], days: { thu: 'Lower A' }, cardio: { wed: 'hiit' } });
    const result = found(planBlocks).filter(finding => finding.code === 'hiit-before-heavy-legs');
    expect(result).toEqual([{ code: 'hiit-before-heavy-legs', blockId: 'b1', detail: 'Lower A' }]);
  });

  it('warns about more than two HIIT sessions', () => {
    const planBlocks = blocks({ cardio: { mon: 'hiit', wed: 'hiit', fri: 'hiit' } });
    expect(codes(found(planBlocks))).toContain('hiit-over-two');
    expect(codes(found(blocks({ cardio: { mon: 'hiit', wed: 'hiit' } })))).not.toContain('hiit-over-two');
  });

  it('warns about a superset on the same muscle', () => {
    const upper = session('s1', [row('bench', 'C', 'g1'), row('fly', 'C', 'g1')], 'Upper A');
    const result = found(blocks({ sessions: [upper], days: { mon: 's1' } })).filter(
      finding => finding.code === 'superset-same-muscle',
    );
    expect(result).toEqual([{ code: 'superset-same-muscle', blockId: 'b1', detail: 'Upper A', sessionId: 's1' }]);
  });

  it('warns about an exercise in a slot that does not match its role', () => {
    const planBlocks = blocks({ sessions: [session('s1', [row('squat', 'C')])], days: { mon: 's1' } });
    const result = found(planBlocks).filter(finding => finding.code === 'role-slot-mismatch');
    expect(result).toEqual([{ code: 'role-slot-mismatch', blockId: 'b1', detail: 'Exercise squat', sessionId: 's1' }]);
  });

  it('warns about a session that runs over the target', () => {
    const long = session('s1', [{ ...row('bench', 'A'), sets: 8 }, { ...row('row', 'B'), sets: 8 }], 'Lower A');
    const planBlocks = blocks({ sessions: [long], days: { mon: 's1' }, targetMinutes: 30 });
    const result = found(planBlocks).filter(finding => finding.code === 'session-over-target');
    expect(result).toHaveLength(1);
    expect(result[0].detail).toBe('Lower A, 44 min');
  });
});

describe('isHeavyLegSession', () => {
  it('looks at the slot A exercise only', () => {
    expect(isHeavyLegSession(session('s', [row('hipThrust', 'A')]), exercises)).toBe(true);
    expect(isHeavyLegSession(session('s', [row('bench', 'A'), row('hipThrust', 'C')]), exercises)).toBe(false);
  });
});

describe('messages', () => {
  it('interpolates the detail', () => {
    expect(blockingMessage({ code: 'block-shorter-than-elapsed', detail: '5' })).toBe(
      'This block has already run 5 weeks',
    );
    expect(blockingMessage({ code: 'missing-sessions', detail: 'Foundation block 1' })).toBe(
      'Foundation block 1 has sessions without exercises before the next check-in form',
    );
    expect(blockingMessage({ code: 'start-date-not-reached', detail: '2 November' })).toBe(
      'Publishing opens on 2 November',
    );
    expect(warningMessage({ code: 'session-over-target', detail: 'Lower A, 72 min' })).toBe(
      'Lower A, 72 min runs over the target',
    );
    expect(warningMessage({ code: 'hiit-over-two' })).toBe('More than 2 HIIT sessions a week');
  });
});
