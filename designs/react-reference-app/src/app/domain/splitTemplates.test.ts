import { describe, expect, it } from 'vitest';
import type { Block, Session } from './program';
import { SPLIT_TEMPLATES, slotPlanFor, type SessionTemplate } from './splitTemplates';

function patternsOf(template: SessionTemplate) {
  return template.slots.map(plan => [plan.slot, plan.patterns]);
}

function session(id: string): Session {
  return {
    id,
    originId: id,
    name: id,
    warmUp: { mobilityExerciseIds: [], warmUpSetsNote: '' },
    coolDown: false,
    rows: [],
  };
}

function blockWith(shape: Block['split']['shape'], sessions: Session[]): Block {
  return {
    id: 'block',
    originId: 'block',
    type: 'hypertrophy',
    weeks: 6,
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

  it('names Full Body sessions by the day count', () => {
    // act
    const two = SPLIT_TEMPLATES['full-body'].sessions(2);
    const three = SPLIT_TEMPLATES['full-body'].sessions(3);

    // assert
    expect(two.map(template => template.name)).toEqual(['Full Body A', 'Full Body B']);
    expect(three.map(template => template.name)).toEqual(['Full Body A', 'Full Body B', 'Full Body C']);
  });

  it('rotates the Full Body main lift and pairs it with the complementary compound', () => {
    // act
    const templates = SPLIT_TEMPLATES['full-body'].sessions(3);

    // assert
    expect(templates.map(patternsOf)).toEqual([
      [['A', ['squat']], ['B', ['hinge', 'lunge']], ['C', ['isolation']], ['D', ['core']]],
      [['A', ['hinge']], ['B', ['squat', 'lunge']], ['C', ['isolation']], ['D', ['core']]],
      [['A', ['horizontal-push']], ['B', ['horizontal-pull', 'vertical-pull']], ['C', ['isolation']], ['D', ['core']]],
    ]);
  });

  it('labels the slots of a session', () => {
    // act
    const [template] = SPLIT_TEMPLATES['full-body'].sessions(2);

    // assert
    expect(template.slots.map(plan => plan.label)).toEqual(['Main lift', 'Secondary', 'Accessories', 'Core / finisher']);
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
    ];

    // assert
    expect(layouts).toEqual([
      ['mon', 'thu'],
      ['mon', 'wed', 'fri'],
      ['mon', 'tue', 'thu', 'fri'],
      ['mon', 'tue', 'wed', 'fri', 'sat'],
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

  it('finds nothing for a session outside the block', () => {
    // arrange
    const block = blockWith('full-body', [session('a'), session('b')]);

    // act
    const plan = slotPlanFor(block, session('elsewhere'), 'A');

    // assert
    expect(plan).toBeUndefined();
  });
});
