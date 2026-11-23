import { describe, expect, it } from 'vitest';
import { exercise, row, startSets } from '../../test/programFixtures';
import type { Block, Row, SetTargets } from './program';
import { blockWithType } from './programEditing';

const SQUAT = exercise('squat', { equipment: ['Barbell'], role: 'main-compound' });

function squatRow(weightKg: number): Row {
  return row({ id: 'row-1', exerciseId: 'squat', startSets: startSets({ count: 4, reps: { min: 6, max: 8 }, rir: 3, lastSetRir: 2, weightKg }), restSeconds: 90 });
}

function hypertrophyBlock(rows: Row[], weeks: number): Block {
  return {
    id: `block-${weeks}`,
    originId: `block-${weeks}`,
    type: 'hypertrophy',
    weeks,
    trainingDays: 2,
    calibrationWeek: false,
    introText: '',
    clientNote: '',
    split: { shape: 'full-body', name: '', text: '' },
    targetMinutes: 45,
    calendar: {
      mon: { kind: 'session', sessionId: 'session-1' },
      tue: { kind: 'rest' },
      wed: { kind: 'rest' },
      thu: { kind: 'rest' },
      fri: { kind: 'rest' },
      sat: { kind: 'rest' },
      sun: { kind: 'rest' },
    },
    sessions: [{ id: 'session-1', originId: 'session-1', name: 'A', warmUp: { items: [] }, coolDown: { enabled: false, items: [] }, rows }],
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: '',
  };
}

function workingStartsOf(block: Block): SetTargets[] {
  return block.sessions[0].rows[0].startSets.filter(set => set.kind === 'working').map(set => set.start);
}

describe('blockWithType', () => {
  it('switches a block to a Deload one week long, prefilled from the last loading week of the block before it', () => {
    // arrange
    const previous = hypertrophyBlock([squatRow(70)], 6);
    const block = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockWithType(block, 'deload', { previous, level: 'intermediate', library: [SQUAT] });

    // assert
    expect(result).toMatchObject({ type: 'deload', weeks: 1 });
    expect(workingStartsOf(result)).toEqual([
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
    ]);
  });

  it('changes a block to another type with that type’s default rest, keeping its weeks and its days', () => {
    // arrange
    const block = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockWithType(block, 'strength', { previous: undefined, level: 'intermediate', library: [SQUAT] });

    // assert
    expect(result).toMatchObject({ type: 'strength', weeks: 4, calendar: block.calendar });
    expect(result.sessions[0].rows[0].restSeconds).toBe(150);
  });
});
