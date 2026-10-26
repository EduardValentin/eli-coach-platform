import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import { exercise as fixtureExercise, row as fixtureRow, session as fixtureSession } from '../../test/programFixtures';
import type { Block, BlockType, CalendarEntry, Row, Session, Slot, Weekday } from './program';
import { cardioPreset, type CardioPresetKind } from './programCardio';
import {
  blockShorterThanElapsed,
  blockingProblems,
  ruleContextFor,
  sequenceProblems,
  warningMessage,
  warnings,
  type RuleContext,
} from './programRules';
import type { ClientJourney } from './journey';
import type { Program, ProgramVersion } from './program';

const publishDay = new Date(2026, 9, 20);

const exercise = (id: string, primaryMuscles: Exercise['primaryMuscles'], role?: Exercise['role'], pattern?: Exercise['pattern']) =>
  fixtureExercise(id, { name: `Exercise ${id}`, primaryMuscles, role, pattern });

const exercises = new Map(
  [
    exercise('squat', ['Quadriceps', 'Glutes'], 'main-compound'),
    exercise('hipThrust', ['Glutes']),
    exercise('bench', ['Chest']),
    exercise('row', ['Upper back']),
    exercise('curl', ['Biceps']),
    exercise('fly', ['Chest']),
    exercise('frontSquat', ['Quadriceps'], 'main-compound', 'squat'),
    exercise('pushUp', ['Chest'], 'secondary-compound', 'horizontal-push'),
    exercise('burpee', ['Full body'], 'secondary-compound', 'conditioning'),
    exercise('jacks', ['Full body'], 'isolation', 'conditioning'),
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

const row = (exerciseId: string, slot: Slot = 'A', supersetGroup?: string): Row =>
  fixtureRow({ id: `${exerciseId}-${slot}`, exerciseId, slot, supersetGroup, sets: THREE_SETS, restSeconds: 90 });

const session = (id: string, rows: Row[] = [row('bench')], name = id): Session => fixtureSession({ id, name, rows });

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
      split: { shape: 'full-body', name: '', text: '' },
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

describe('the window that must hold filled sessions', () => {
  const empty = session('s1', [row('')]);
  const filledThenEmpty = (firstWeeks: number) =>
    blocks({ type: 'foundation', weeks: firstWeeks, days: { mon: 's1' } }, { type: 'hypertrophy', weeks: 2, sessions: [empty], days: { mon: 's1' } });

  it('runs to the next check-in form when it falls later than two weeks', () => {
    // arrange
    const dayOne = addDays(publishDay, 2);

    // act
    const found = blockingProblems(content(filledThenEmpty(2)), 'x', context({ dayOne, preferredWeekday: 'mon' }));

    // assert
    expect(found).toContainEqual({ code: 'missing-sessions', blockId: 'b2', detail: 'Hypertrophy block 2' });
  });

  it('runs two weeks when the next check-in form is sooner', () => {
    // arrange
    const dayOne = addDays(publishDay, -13);

    // act
    const inside = blockingProblems(content(filledThenEmpty(3)), 'x', context({ dayOne, preferredWeekday: 'wed' }));
    const outside = blockingProblems(content(filledThenEmpty(4)), 'x', context({ dayOne, preferredWeekday: 'wed' }));

    // assert
    expect(codes(inside)).toContain('missing-sessions');
    expect(codes(outside)).not.toContain('missing-sessions');
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

  it('flags a calendar cardio day whose session has no segments', () => {
    // arrange
    const [block] = blocks({ type: 'foundation', weeks: 2, days: { mon: 's1' }, cardio: { wed: 'liss' } });
    const planBlocks = [{ ...block, cardioSessions: block.cardioSessions.map(cardio => ({ ...cardio, segments: [] })) }];

    // act
    const found = blockingProblems(content(planBlocks), 'x', context());

    // assert
    expect(found).toContainEqual({ code: 'missing-sessions', blockId: 'b1', detail: 'Foundation block 1' });
  });

  it('passes a cardio day whose session has segments', () => {
    // arrange
    const planBlocks = blocks({ type: 'foundation', weeks: 2, days: { mon: 's1' }, cardio: { wed: 'liss' } });

    // act
    const found = blockingProblems(content(planBlocks), 'x', context());

    // assert
    expect(codes(found)).not.toContain('missing-sessions');
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
    const found = blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 3 }), publishedBlocks: blocks({ weeks: 8 }), dayOne, today: publishDay });
    expect(found).toEqual([{ code: 'block-shorter-than-elapsed', blockId: 'b1', detail: '5' }]);
  });

  it('flags a block that would cut the running week', () => {
    expect(blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 5 }), publishedBlocks: blocks({ weeks: 8 }), dayOne, today: publishDay })).toHaveLength(1);
  });

  it('passes when the block covers the running week', () => {
    expect(blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 6 }), publishedBlocks: blocks({ weeks: 8 }), dayOne, today: publishDay })).toEqual([]);
  });

  it('passes without a day 1', () => {
    expect(blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 1 }), publishedBlocks: blocks({ weeks: 8 }), dayOne: null, today: publishDay })).toEqual([]);
  });

  it('passes without a published plan', () => {
    expect(blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 1 }), publishedBlocks: null, dayOne, today: publishDay })).toEqual([]);
  });

  it('shrinking the current block in a draft is caught against the published plan', () => {
    const published = blocks({ weeks: 6 }, { weeks: 4 });
    const draft = blocks({ weeks: 3 }, { weeks: 4 });
    const found = blockShorterThanElapsed({ draftBlocks: draft, publishedBlocks: published, dayOne, today: publishDay });
    expect(found).toEqual([{ code: 'block-shorter-than-elapsed', blockId: 'b1', detail: '5' }]);
  });

  it('flags a current block that the draft removed', () => {
    const published = blocks({ weeks: 6 }, { weeks: 4 });
    const found = blockShorterThanElapsed({ draftBlocks: blocks({ weeks: 4 }).map(block => ({ ...block, originId: 'other' })), publishedBlocks: published, dayOne, today: publishDay });
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

  it('counts a finisher of hard rounds as HIIT, but not rounds at a lower intensity', () => {
    // arrange
    const [block] = blocks({ cardio: { tue: 'hiit', thu: 'hiit', sat: 'finisher' } });
    const softened = {
      ...block,
      cardioSessions: block.cardioSessions.map(cardio =>
        cardio.name === 'Finisher' ? { ...cardio, segments: cardio.segments.map(segment => ({ ...segment, intensity: 'moderate' as const })) } : cardio,
      ),
    };

    // act
    const found = warnings(content([block]), context());
    const passed = warnings(content([softened]), context());

    // assert
    expect(codes(found)).toContain('hiit-over-two');
    expect(codes(passed)).not.toContain('hiit-over-two');
  });

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

describe('slot pattern warnings', () => {
  const fullBody = (sessions: Session[]): Block => blocks({ sessions })[0];

  it('warns about an exercise whose pattern is not one its slot plans for', () => {
    // arrange
    const planned = session('s1', [row('frontSquat', 'A'), row('pushUp', 'C'), row('burpee', 'D')]);

    // act
    const found = warnings(content([fullBody([planned])]), context());

    // assert
    expect(found.filter(finding => finding.code === 'role-slot-mismatch')).toEqual([
      { code: 'role-slot-mismatch', blockId: 'b1', sessionId: 's1', detail: 'Exercise burpee' },
    ]);
    expect(warningMessage(found.find(finding => finding.code === 'role-slot-mismatch')!)).toBe('Exercise burpee does not match its slot');
  });

  it('accepts any role in a slot whose patterns match', () => {
    // arrange
    const planned = session('s1', [row('pushUp', 'C'), row('frontSquat', 'A')]);

    // act
    const found = warnings(content([fullBody([planned])]), context());

    // assert
    expect(codes(found)).not.toContain('role-slot-mismatch');
  });

  it('never warns about rows in a slot without a plan or exercises without a pattern', () => {
    // arrange
    const sessions = Array.from({ length: 6 }, (_, index) => session(`s${index + 1}`, index === 5 ? [row('jacks', 'D')] : [row('curl', 'C')]));

    // act
    const found = warnings(content([fullBody(sessions)]), context());

    // assert
    expect(codes(found)).not.toContain('role-slot-mismatch');
  });
});

describe('sequenceProblems', () => {
  it('reports only the order rules of the plan', () => {
    // arrange
    const planBlocks = blocks({ type: 'deload', weeks: 2 }, { type: 'foundation' }, { type: 'deload' }, { type: 'deload', weeks: 1 });

    // act
    const found = sequenceProblems(planBlocks);

    // assert
    expect(codes(found)).toEqual(['starts-with-deload', 'deload-not-one-week', 'foundation-not-first', 'deload-not-one-week', 'consecutive-deloads']);
  });
});

describe('ruleContextFor', () => {
  const published = { number: 1, state: 'published', content: content(blocks({ type: 'foundation' })) } as ProgramVersion;
  const draft = { number: 2, state: 'draft', content: content(blocks({ type: 'hypertrophy' })) } as ProgramVersion;
  const program = { level: 'advanced', versions: [published, draft] } as Program;
  const library = [...exercises.values()];

  it('reads day 1, the preferred check-in day and a pending details request from the journey', () => {
    // arrange
    const dayOne = addDays(publishDay, -7);
    const journey = {
      stage: 'needs-details',
      programReadyAt: dayOne,
      settings: { preferredCheckInWeekday: 'thu', preferredChannel: 'email' },
    } as unknown as ClientJourney;

    // act
    const ruleContext = ruleContextFor({ journey, program, draft, today: publishDay, exercises: library });

    // assert
    expect(ruleContext).toMatchObject({
      versionNumber: 2,
      publishDay,
      dayOne,
      preferredWeekday: 'thu',
      level: 'advanced',
      startDate: null,
      detailsPending: true,
      publishedBlocks: published.content.plan.blocks,
    });
    expect(ruleContext.exercisesById.get('squat')).toBe(exercises.get('squat'));
  });

  it('falls back to no day 1 and a Monday check-in without a journey', () => {
    // act
    const ruleContext = ruleContextFor({ journey: null, program, draft, today: publishDay, exercises: library });

    // assert
    expect(ruleContext).toMatchObject({ dayOne: null, preferredWeekday: 'mon', detailsPending: false, startDate: null });
  });
});
