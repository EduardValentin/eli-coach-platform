import { describe, expect, it } from 'vitest';
import type { Block, Session } from './program';
import { exercise, row } from '../../test/programFixtures';
import { patternChoicesFor, slotExercisePatterns, SPLIT_TEMPLATES, slotPlanFor, withMainPattern, withSecondaryPatterns, type SessionTemplate } from './splitTemplates';

function patternsOf(template: SessionTemplate) {
  return template.slots.map(plan => [plan.slot, plan.patterns]);
}

function session(id: string): Session {
  return {
    id,
    originId: id,
    name: id,
    warmUp: { items: [] },
    coolDown: { enabled: false, note: '', items: [] },
    rows: [],
  };
}

function blockWith(shape: Block['split']['shape'], sessions: Session[]): Block {
  return {
    id: 'block',
    originId: 'block',
    type: 'hypertrophy',
    weeks: 6,
    trainingDays: 4,
    calibrationWeek: false,
    introText: '',
    clientNote: '',
    split: { shape, name: '', text: '' },
    targetMinutes: 60,
    calendar: {
      mon: { kind: 'rest' },
      tue: { kind: 'rest' },
      wed: { kind: 'rest' },
      thu: { kind: 'rest' },
      fri: { kind: 'rest' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    },
    sessions,
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: '',
  };
}

describe('SPLIT_TEMPLATES', () => {
  it('labels each split', () => {
    // act
    const { 'full-body': fullBody, 'upper-lower': upperLower } = SPLIT_TEMPLATES;

    // assert
    expect([fullBody.shape, fullBody.label]).toEqual(['full-body', 'Full Body']);
    expect([upperLower.shape, upperLower.label]).toEqual(['upper-lower', 'Upper / Lower']);
  });

  it('names Full Body sessions by the day count, up to five days', () => {
    // act
    const two = SPLIT_TEMPLATES['full-body'].sessions(2);
    const five = SPLIT_TEMPLATES['full-body'].sessions(5);

    // assert
    expect(two.map(template => template.name)).toEqual(['Full Body A', 'Full Body B']);
    expect(five.map(template => template.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D', 'Full Body E']);
  });

  it('covers every pattern in each Full Body session, alternating squat and hinge as the main lift', () => {
    // act
    const templates = SPLIT_TEMPLATES['full-body'].sessions(3);

    // assert
    const accessories = [
      ['C', ['horizontal-push', 'vertical-push']],
      ['C', ['horizontal-pull', 'vertical-pull']],
    ];
    expect(templates.map(patternsOf)).toEqual([
      [['A', ['squat']], ['B', ['hinge', 'lunge']], ...accessories, ['D', ['core']]],
      [['A', ['hinge']], ['B', ['squat', 'lunge']], ...accessories, ['D', ['core']]],
      [['A', ['squat']], ['B', ['hinge', 'lunge']], ...accessories, ['D', ['core']]],
    ]);
  });

  it('labels the slots of a session', () => {
    // act
    const [template] = SPLIT_TEMPLATES['full-body'].sessions(2);

    // assert
    expect(template.slots.map(plan => plan.label)).toEqual(['Main lift', 'Secondary', 'Accessories', 'Accessories', 'Core / finisher']);
  });

  it('alternates lower and upper sessions and repeats Lower A on a fifth day', () => {
    // act
    const four = SPLIT_TEMPLATES['upper-lower'].sessions(4);
    const five = SPLIT_TEMPLATES['upper-lower'].sessions(5);

    // assert
    expect(four.map(template => template.name)).toEqual(['Lower A', 'Upper A', 'Lower B', 'Upper B']);
    expect(five.map(template => template.name)).toEqual(['Lower A', 'Upper A', 'Lower B', 'Upper B', 'Lower C']);
    expect(patternsOf(five[4])).toEqual(patternsOf(five[0]));
  });

  it('gives each Upper / Lower session its slot plan', () => {
    // act
    const templates = SPLIT_TEMPLATES['upper-lower'].sessions(4);

    // assert
    expect(templates.map(patternsOf)).toEqual([
      [['A', ['squat']], ['B', ['hinge', 'lunge']], ['C', ['isolation']], ['D', ['core']]],
      [['A', ['horizontal-push']], ['B', ['vertical-pull', 'horizontal-pull']], ['C', ['isolation']], ['D', ['core']]],
      [['A', ['hinge']], ['B', ['lunge', 'squat']], ['C', ['isolation']], ['D', ['core']]],
      [['A', ['vertical-pull']], ['B', ['vertical-push', 'horizontal-push']], ['C', ['isolation']], ['D', ['core']]],
    ]);
  });

  it('lays the sessions out across the week', () => {
    // act
    const layouts = [
      SPLIT_TEMPLATES['full-body'].layout(2),
      SPLIT_TEMPLATES['full-body'].layout(3),
      SPLIT_TEMPLATES['upper-lower'].layout(4),
      SPLIT_TEMPLATES['upper-lower'].layout(5),
      SPLIT_TEMPLATES['full-body'].layout(4),
      SPLIT_TEMPLATES['upper-lower'].layout(2),
    ];

    // assert
    expect(layouts).toEqual([
      ['mon', 'thu'],
      ['mon', 'wed', 'fri'],
      ['mon', 'tue', 'thu', 'fri'],
      ['mon', 'tue', 'wed', 'fri', 'sat'],
      ['mon', 'tue', 'thu', 'fri'],
      ['mon', 'thu'],
    ]);
  });
});

describe('slotPlanFor', () => {
  it('reads the slot plan of the session at its position in the block', () => {
    // arrange
    const sessions = ['lower-a', 'upper-a', 'lower-b', 'upper-b'].map(session);
    const block = blockWith('upper-lower', sessions);

    // act
    const plan = slotPlanFor(block, sessions[3], 'B');

    // assert
    expect(plan).toEqual({ slot: 'B', patterns: ['vertical-push', 'horizontal-push'], label: 'Secondary' });
  });

  it('joins the patterns of a slot planned as a superset', () => {
    // arrange
    const sessions = [session('a'), session('b')];
    const block = blockWith('full-body', sessions);

    // act
    const plan = slotPlanFor(block, sessions[1], 'C');

    // assert
    expect(plan).toEqual({
      slot: 'C',
      patterns: ['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull'],
      label: 'Accessories',
    });
  });

  it('finds nothing for a session outside the block', () => {
    // arrange
    const block = blockWith('full-body', [session('a'), session('b')]);

    // act
    const plan = slotPlanFor(block, session('elsewhere'), 'A');

    // assert
    expect(plan).toBeUndefined();
  });
});

describe('slot pattern choices', () => {
  const lowerA = session('lower-a');
  const upperA = session('upper-a');
  const block = blockWith('upper-lower', [lowerA, upperA, session('lower-b'), session('upper-b')]);

  it('offers the lower-body patterns for a lower session and the upper-body patterns for an upper one', () => {
    // act
    const lower = patternChoicesFor(block, lowerA, 'A');
    const upper = patternChoicesFor(block, upperA, 'B');

    // assert
    expect(lower).toEqual(['squat', 'hinge', 'lunge']);
    expect(upper).toEqual(['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull']);
  });

  it('offers no choice for the accessory and core slots', () => {
    // act
    const choices = [patternChoicesFor(block, lowerA, 'C'), patternChoicesFor(block, lowerA, 'D')];

    // assert
    expect(choices).toEqual([[], []]);
  });

  it('swaps the new main lift pattern out of the secondary slot', () => {
    // act
    const changed = withMainPattern(block, lowerA, 'hinge');
    const withChange = { ...block, sessions: [changed, ...block.sessions.slice(1)] };

    // assert
    expect(slotPlanFor(withChange, changed, 'A')?.patterns).toEqual(['hinge']);
    expect(slotPlanFor(withChange, changed, 'B')?.patterns).toEqual(['squat', 'lunge']);
  });

  it('keeps the secondary slot when it does not hold the new main lift pattern', () => {
    // act
    const changed = withMainPattern(block, upperA, 'vertical-push');
    const withChange = { ...block, sessions: [lowerA, changed, ...block.sessions.slice(2)] };

    // assert
    expect(slotPlanFor(withChange, changed, 'B')?.patterns).toEqual(['vertical-pull', 'horizontal-pull']);
  });

  it('stores the chosen secondary patterns in the order they are offered', () => {
    // act
    const changed = withSecondaryPatterns(block, lowerA, ['lunge', 'squat']);
    const withChange = { ...block, sessions: [changed, ...block.sessions.slice(1)] };

    // assert
    expect(slotPlanFor(withChange, changed, 'B')?.patterns).toEqual(['squat', 'lunge']);
  });
});

describe('slotExercisePatterns', () => {
  it('names the patterns of the exercises in the slot, once each, in row order', () => {
    // arrange
    const library = [
      exercise('split-squat', { pattern: 'lunge' }),
      exercise('rdl', { pattern: 'hinge' }),
      exercise('step-up', { pattern: 'lunge' }),
      exercise('band-walk'),
      exercise('bench', { pattern: 'horizontal-push' }),
    ];
    const filled = {
      ...session('A'),
      rows: [
        row({ id: '1', slot: 'C', exerciseId: 'split-squat' }),
        row({ id: '2', slot: 'C', exerciseId: 'rdl' }),
        row({ id: '3', slot: 'C', exerciseId: 'step-up' }),
        row({ id: '4', slot: 'C', exerciseId: 'band-walk' }),
        row({ id: '5', slot: 'D', exerciseId: 'bench' }),
      ],
    };

    // act
    const patterns = slotExercisePatterns(filled, 'C', library);

    // assert
    expect(patterns).toEqual(['lunge', 'hinge']);
  });

  it('names no pattern for an empty slot', () => {
    // act
    const patterns = slotExercisePatterns(session('A'), 'A', [exercise('squat', { pattern: 'squat' })]);

    // assert
    expect(patterns).toEqual([]);
  });
});
