import { describe, expect, it } from 'vitest';
import { row, session, workingSets } from '../../test/programFixtures';
import type { Block } from './program';
import { estimatedMinutes, isOverTarget } from './sessionTiming';

const supersetSession = session({
  id: 'A',
  rows: [
    row({ id: '1', sets: workingSets(4), restSeconds: 150 }),
    row({ id: '2', slot: 'B', sets: workingSets(3), restSeconds: 105 }),
    row({ id: '3', slot: 'C', sets: workingSets(3), restSeconds: 75, supersetGroup: 'g' }),
    row({ id: '4', slot: 'C', sets: workingSets(3), restSeconds: 75, supersetGroup: 'g' }),
  ],
});

describe('estimatedMinutes', () => {
  it('counts superset rest once per round', () => {
    // act
    const minutes = estimatedMinutes(supersetSession);

    // assert
    expect(minutes).toBe(37);
  });

  it('adds the cool-down', () => {
    // act
    const minutes = estimatedMinutes({ ...supersetSession, coolDown: { ...supersetSession.coolDown, enabled: true } });

    // assert
    expect(minutes).toBe(42);
  });
});

describe('isOverTarget', () => {
  it('flags a session only once it runs more than ten minutes over the block target', () => {
    // arrange
    const withTarget = (targetMinutes: number) => ({ targetMinutes }) as Block;

    // act
    const atTolerance = isOverTarget(supersetSession, withTarget(27));
    const beyondTolerance = isOverTarget(supersetSession, withTarget(26));

    // assert
    expect(atTolerance).toBe(false);
    expect(beyondTolerance).toBe(true);
  });
});
