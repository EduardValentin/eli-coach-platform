import { describe, expect, it } from 'vitest';
import { exercise, session as emptySession } from '../../test/programFixtures';
import type { Session } from './program';
import { warmUpEdits } from './warmUpEditing';

const LIBRARY = [
  exercise('hips', { type: 'mobility' }),
  exercise('catCow', { type: 'mobility', measuredIn: 'time' }),
  exercise('worldsGreatest', { type: 'mobility' }),
];

function added(...ids: string[]): Session {
  return ids.reduce((session, id) => warmUpEdits(session, LIBRARY).add(id), emptySession());
}

describe('warmUpEdits', () => {
  it('adds warm-up exercises as one set of reps or seconds, changes and removes them', () => {
    // arrange
    const withCatCow = added('hips', 'catCow');
    const [hips, catCow] = withCatCow.warmUp.items;

    // act
    const twice = warmUpEdits(withCatCow, LIBRARY).add('hips');
    const changed = warmUpEdits(withCatCow, LIBRARY).changeItem({ ...hips, sets: 2 });
    const removed = warmUpEdits(changed, LIBRARY).remove(catCow.id);

    // assert
    expect([hips, catCow]).toEqual([
      { id: expect.any(String), exerciseId: 'hips', sets: 1, reps: { min: 10, max: 10 } },
      { id: expect.any(String), exerciseId: 'catCow', sets: 1, seconds: 45 },
    ]);
    expect(twice).toEqual(withCatCow);
    expect(removed.warmUp.items).toEqual([{ ...hips, sets: 2 }]);
  });

  it('reorders warm-up exercises', () => {
    // arrange
    const start = added('hips', 'catCow', 'worldsGreatest');
    const [hips, , worldsGreatest] = start.warmUp.items;
    const order = (session: Session) => session.warmUp.items.map(item => item.exerciseId);

    // act
    const up = warmUpEdits(start, LIBRARY).moveUp(worldsGreatest.id);
    const down = warmUpEdits(start, LIBRARY).moveDown(hips.id);
    const beforeTheStart = warmUpEdits(start, LIBRARY).moveUp(hips.id);

    // assert
    expect(order(up)).toEqual(['hips', 'worldsGreatest', 'catCow']);
    expect(order(down)).toEqual(['catCow', 'hips', 'worldsGreatest']);
    expect(beforeTheStart).toEqual(start);
  });
});
