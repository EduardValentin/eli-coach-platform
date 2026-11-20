import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import { exercise, row, session, startSets } from '../../test/programFixtures';
import type { Block, PlannedSet, Row, Session, WeekSession } from './program';
import { sessionAtWeek, withSetAdded } from './programProgression';
import { estimatedDuration, estimatedMinutes, isOverTarget, longestWeekMinutes } from './sessionTiming';

const squat = exercise('squat');
const plank = exercise('plank', { measuredIn: 'time' });
const sidePlank = exercise('side-plank', { measuredIn: 'time', perSide: true });
const hipSwitch = exercise('hip-switch', { perSide: true });
const pigeon = exercise('pigeon', { type: 'stretching', perSide: true });
const childPose = exercise('child-pose', { type: 'stretching' });
const exercises = new Map<string, Exercise>([squat, plank, sidePlank, hipSwitch, pigeon, childPose].map(item => [item.id, item]));

function heldSets(count: number, seconds: number): PlannedSet[] {
  return startSets({ count, reps: { min: seconds, max: seconds } });
}

function blockOf(weeks: number, targetMinutes = 60): Block {
  return { type: 'hypertrophy', weeks, calibrationWeek: false, targetMinutes } as Block;
}

function firstWeek(stored: Session): WeekSession {
  return sessionAtWeek(stored, 1, { block: blockOf(1), level: 'intermediate', exercisesById: exercises });
}

const twoSquats = [row({ id: '1', exerciseId: 'squat', restSeconds: 90 }), row({ id: '2', exerciseId: 'squat', slot: 'B', restSeconds: 90 })];

describe('estimatedMinutes', () => {
  it('estimates an empty session at zero minutes', () => {
    // act
    const minutes = estimatedMinutes(firstWeek(session()), exercises);

    // assert
    expect(minutes).toBe(0);
  });

  it('times reps at four seconds each, with the setup and the rest between working sets', () => {
    // arrange
    const reps = session({ rows: [row({ exerciseId: 'squat', restSeconds: 60 })] });

    // act
    const minutes = estimatedMinutes(firstWeek(reps), exercises);

    // assert
    expect(minutes).toBe(5);
  });

  it('adds a short rest after every warm-up set', () => {
    // arrange
    const withWarmUpSet = session({ rows: [row({ exerciseId: 'squat', startSets: startSets({}, [{ reps: { min: 5, max: 5 }, rir: 3 }]), restSeconds: 60 })] });

    // act
    const minutes = estimatedMinutes(firstWeek(withWarmUpSet), exercises);

    // assert
    expect(minutes).toBe(6);
  });

  it('times held exercises by their prescribed seconds, twice for each side', () => {
    // arrange
    const held = session({ rows: [row({ exerciseId: 'plank', startSets: heldSets(3, 20), restSeconds: 60 })] });
    const heldPerSide = session({ rows: [row({ exerciseId: 'side-plank', startSets: heldSets(3, 20), restSeconds: 60 })] });

    // act
    const minutes = [estimatedMinutes(firstWeek(held), exercises), estimatedMinutes(firstWeek(heldPerSide), exercises)];

    // assert
    expect(minutes).toEqual([4, 5]);
  });

  it('rests once per superset round instead of after every exercise', () => {
    // arrange
    const separate = session({ rows: twoSquats });
    const superset = session({ rows: twoSquats.map(other => ({ ...other, slot: 'C' as const, supersetGroup: 'g' })) });

    // act
    const minutes = [estimatedMinutes(firstWeek(separate), exercises), estimatedMinutes(firstWeek(superset), exercises)];

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
      rows: [row({ id: '1', exerciseId: 'squat', restSeconds: 60 }), row({ id: '2', exerciseId: 'plank', slot: 'D', startSets: heldSets(3, 20), restSeconds: 60 })],
      coolDown: {
        enabled: true,
        items: [
          { id: 'c1', exerciseId: 'child-pose', seconds: 30 },
          { id: 'c2', exerciseId: 'pigeon', seconds: 30 },
        ],
      },
    });

    // act
    const withCoolDown = estimatedMinutes(firstWeek(mixed), exercises);
    const withoutCoolDown = estimatedMinutes(firstWeek({ ...mixed, coolDown: { ...mixed.coolDown, enabled: false } }), exercises);

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

describe('longestWeekMinutes', () => {
  it('times a session by its longest week', () => {
    // arrange
    const held = { ...twoSquats[0], progression: { kind: 'custom' as const, text: '' } };
    const progression = { block: blockOf(4), level: 'intermediate' as const };
    const moreSetsInWeek3 = [1, 2, 3].reduce<Row>(next => withSetAdded(next, 3, progression), held);
    const stored = session({ rows: [moreSetsInWeek3] });
    const timing = { ...progression, exercises };

    // act
    const minutes = longestWeekMinutes(stored, timing);

    // assert
    expect(estimatedMinutes(firstWeek(stored), exercises)).toBe(6);
    expect(minutes).toBe(13);
  });
});

describe('isOverTarget', () => {
  it('flags a session only once it runs more than ten minutes over the block target', () => {
    // arrange
    const twelveMinutes = session({ rows: twoSquats });
    const withTarget = (targetMinutes: number) => ({ block: blockOf(1, targetMinutes), level: 'intermediate' as const, exercises });

    // act
    const atTolerance = isOverTarget(twelveMinutes, withTarget(2));
    const beyondTolerance = isOverTarget(twelveMinutes, withTarget(1));

    // assert
    expect(atTolerance).toBe(false);
    expect(beyondTolerance).toBe(true);
  });
});
