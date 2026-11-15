import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import { exercise, row, session, workingSets } from '../../test/programFixtures';
import type { Block, SetSpec } from './program';
import { estimatedDuration, estimatedMinutes, isOverTarget } from './sessionTiming';

const squat = exercise('squat');
const plank = exercise('plank', { measuredIn: 'time' });
const sidePlank = exercise('side-plank', { measuredIn: 'time', perSide: true });
const hipSwitch = exercise('hip-switch', { perSide: true });
const pigeon = exercise('pigeon', { type: 'stretching', perSide: true });
const childPose = exercise('child-pose', { type: 'stretching' });
const exercises = new Map<string, Exercise>([squat, plank, sidePlank, hipSwitch, pigeon, childPose].map(item => [item.id, item]));

function heldSets(count: number, seconds: number): SetSpec[] {
  return Array.from({ length: count }, () => ({ kind: 'working', reps: { min: seconds, max: seconds }, rir: { min: 1, max: 2 } }));
}

const twoSquats = [row({ id: '1', exerciseId: 'squat', restSeconds: 90 }), row({ id: '2', exerciseId: 'squat', slot: 'B', restSeconds: 90 })];

describe('estimatedMinutes', () => {
  it('estimates an empty session at zero minutes', () => {
    // act
    const minutes = estimatedMinutes(session(), exercises);

    // assert
    expect(minutes).toBe(0);
  });

  it('times reps at four seconds each, with the setup and the rest between working sets', () => {
    // arrange
    const reps = session({ rows: [row({ exerciseId: 'squat', sets: workingSets(3), restSeconds: 60 })] });

    // act
    const minutes = estimatedMinutes(reps, exercises);

    // assert
    expect(minutes).toBe(5);
  });

  it('adds a short rest after every warm-up set', () => {
    // arrange
    const sets: SetSpec[] = [{ kind: 'warm-up', reps: { min: 5, max: 5 } }, ...workingSets(3)];
    const withWarmUpSet = session({ rows: [row({ exerciseId: 'squat', sets, restSeconds: 60 })] });

    // act
    const minutes = estimatedMinutes(withWarmUpSet, exercises);

    // assert
    expect(minutes).toBe(6);
  });

  it('times held exercises by their prescribed seconds, twice for each side', () => {
    // arrange
    const held = session({ rows: [row({ exerciseId: 'plank', sets: heldSets(3, 20), restSeconds: 60 })] });
    const heldPerSide = session({ rows: [row({ exerciseId: 'side-plank', sets: heldSets(3, 20), restSeconds: 60 })] });

    // act
    const minutes = [estimatedMinutes(held, exercises), estimatedMinutes(heldPerSide, exercises)];

    // assert
    expect(minutes).toEqual([4, 5]);
  });

  it('rests once per superset round instead of after every exercise', () => {
    // arrange
    const separate = session({ rows: twoSquats });
    const superset = session({ rows: twoSquats.map(other => ({ ...other, slot: 'C' as const, supersetGroup: 'g' })) });

    // act
    const minutes = [estimatedMinutes(separate, exercises), estimatedMinutes(superset, exercises)];

    // assert
    expect(minutes).toEqual([12, 9]);
  });

  it('adds the warm-up items and, while it is on, the cool-down stretches by their own amounts', () => {
    // arrange
    const mixed = session({
      warmUp: {
        items: [
          { id: 'w1', exerciseId: 'hip-switch', sets: 2, reps: { min: 5, max: 5 } },
          { id: 'w2', exerciseId: 'plank', sets: 1, seconds: 30 },
        ],
      },
      rows: [row({ id: '1', exerciseId: 'squat', restSeconds: 60 }), row({ id: '2', exerciseId: 'plank', slot: 'D', sets: heldSets(3, 20), restSeconds: 60 })],
      coolDown: {
        enabled: true,
        items: [
          { id: 'c1', exerciseId: 'child-pose', seconds: 30 },
          { id: 'c2', exerciseId: 'pigeon', seconds: 30 },
        ],
      },
    });

    // act
    const withCoolDown = estimatedMinutes(mixed, exercises);
    const withoutCoolDown = estimatedMinutes({ ...mixed, coolDown: { ...mixed.coolDown, enabled: false } }, exercises);

    // assert
    expect(withCoolDown).toBe(13);
    expect(withoutCoolDown).toBe(11);
  });
});

describe('estimatedDuration', () => {
  it('marks an estimate as approximate but states zero plainly', () => {
    // act
    const texts = [estimatedDuration(0), estimatedDuration(13)];

    // assert
    expect(texts).toEqual(['0 min', '~13 min']);
  });
});

describe('isOverTarget', () => {
  it('flags a session only once it runs more than ten minutes over the block target', () => {
    // arrange
    const twelveMinutes = session({ rows: twoSquats });
    const withTarget = (targetMinutes: number) => ({ targetMinutes }) as Block;

    // act
    const atTolerance = isOverTarget(twelveMinutes, withTarget(2), exercises);
    const beyondTolerance = isOverTarget(twelveMinutes, withTarget(1), exercises);

    // assert
    expect(atTolerance).toBe(false);
    expect(beyondTolerance).toBe(true);
  });
});
