import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { Block, BlockType, CalendarEntry, Row, Session, Slot, Weekday } from './program';
import { cardioPreset, type CardioPresetKind } from './programCardio';
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
  publishedBlocks: null,
  exercisesById: exercises,
  ...overrides,
});

const THREE_SETS = Array.from({ length: 3 }, () => ({ kind: 'working' as const, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } }));

const row = (exerciseId: string, slot: Slot = 'A', supersetGroup?: string) =>
  ({ id: `${exerciseId}-${slot}`, exerciseId, slot, supersetGroup, sets: THREE_SETS, restSeconds: 90 }) as Row;

const session = (id: string, rows: Row[] = [row('bench')], name = id): Session =>
  ({ id, name, rows, coolDown: false }) as Session;

type Spec = {
  type?: BlockType;
  weeks?: number;
  sessions?: Session[];
  days?: Partial<Record<Weekday, string>>;
  cardio?: Partial<Record<Weekday, CardioPresetKind>>;
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
      originId: `o${index + 1}`,
      type: spec.type ?? 'hypertrophy',
      weeks: spec.weeks ?? 4,
      targetMinutes: spec.targetMinutes ?? 60,
      calendar,
      sessions,
      cardioSessions: Object.entries(spec.cardio ?? {}).map(([weekday, kind]) => ({
        ...cardioPreset(kind, []),
        id: `${weekday}-cardio`,
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
    const found = blockShorterThanElapsed(blocks({ weeks: 3 }), blocks({ weeks: 8 }), dayOne, publishDay);
    expect(found).toEqual([{ code: 'block-shorter-than-elapsed', blockId: 'b1', detail: '5' }]);
  });

  it('flags a block that would cut the running week', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 5 }), blocks({ weeks: 8 }), dayOne, publishDay)).toHaveLength(1);
  });

  it('passes when the block covers the running week', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 6 }), blocks({ weeks: 8 }), dayOne, publishDay)).toEqual([]);
  });

  it('passes without a day 1', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 1 }), blocks({ weeks: 8 }), null, publishDay)).toEqual([]);
  });

  it('passes without a published plan', () => {
    expect(blockShorterThanElapsed(blocks({ weeks: 1 }), null, dayOne, publishDay)).toEqual([]);
  });

  it('shrinking the current block in a draft is caught against the published plan', () => {
    const published = blocks({ weeks: 6 }, { weeks: 4 });
    const draft = blocks({ weeks: 3 }, { weeks: 4 });
    const found = blockShorterThanElapsed(draft, published, dayOne, publishDay);
    expect(found).toEqual([{ code: 'block-shorter-than-elapsed', blockId: 'b1', detail: '5' }]);
  });

  it('flags a current block that the draft removed', () => {
    const published = blocks({ weeks: 6 }, { weeks: 4 });
    const found = blockShorterThanElapsed(blocks({ weeks: 4 }).map(block => ({ ...block, originId: 'other' })), published, dayOne, publishDay);
    expect(found).toHaveLength(1);
  });

  it('is part of the blocking problems', () => {
    const published = blocks({ type: 'foundation', weeks: 8 });
    const found = blockingProblems(
      content(blocks({ type: 'foundation', weeks: 3 })),
      'x',
      context({ dayOne, publishedBlocks: published }),
    );
    expect(codes(found)).toContain('block-shorter-than-elapsed');
  });
});

describe('cardio schedule warnings', () => {
  const legs = session('legs', [row('squat')], 'Lower A');

  it('warns about more than two cardio sessions with intervals', () => {
    // arrange
    const three = blocks({ cardio: { tue: 'hiit', thu: 'hiit', sat: 'hiit' } });
    const two = blocks({ cardio: { tue: 'hiit', thu: 'hiit', sat: 'moderate' } });

    // act
    const [found, passed] = [warnings(content(three), context()), warnings(content(two), context())];

    // assert
    expect(codes(found)).toContain('hiit-over-two');
    expect(codes(passed)).not.toContain('hiit-over-two');
  });

  it('warns about intervals the day before a heavy leg session', () => {
    // arrange
    const planBlocks = blocks({ sessions: [legs], days: { tue: 'legs' }, cardio: { mon: 'hiit' } });

    // act
    const found = warnings(content(planBlocks), context());

    // assert
    expect(found).toContainEqual({ code: 'hiit-before-heavy-legs', blockId: 'b1', detail: 'Lower A' });
  });

  it('ignores steady cardio the day before a heavy leg session', () => {
    // arrange
    const planBlocks = blocks({ sessions: [legs], days: { tue: 'legs' }, cardio: { mon: 'moderate' } });

    // act
    const found = warnings(content(planBlocks), context());

    // assert
    expect(codes(found)).not.toContain('hiit-before-heavy-legs');
  });

  it('counts a cardio day as hard unless every segment is steady and easy', () => {
    // arrange
    const moderate = blocks({ days: { mon: 's1' }, cardio: { tue: 'moderate' } });
    const easy = blocks({ days: { mon: 's1' }, cardio: { tue: 'liss' } });

    // act
    const [found, passed] = [warnings(content(moderate), context()), warnings(content(easy), context())];

    // assert
    expect(found).toContainEqual({ code: 'hard-days-in-a-row', blockId: 'b1', detail: 'Mon and Tue' });
    expect(codes(passed)).not.toContain('hard-days-in-a-row');
  });
});
