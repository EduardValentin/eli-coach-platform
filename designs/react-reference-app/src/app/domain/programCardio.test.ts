import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { CardioSession } from './program';
import { CARDIO_INTENSITY_TEXT, cardioEdits, cardioMinutes, cardioPreset, emptyCardioSession, hasIntervals, isLightCardio } from './programCardio';

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    cues: '',
    type: 'cardio',
    measuredIn: 'time',
    perSide: false,
    equipment: [],
    difficulty: 'Beginner',
    primaryMuscles: [],
    secondaryMuscles: [],
    tags: [],
    ...overrides,
  };
}

const LIBRARY: Exercise[] = [
  exercise('lunges', { name: 'Walking Lunges', type: 'resistance', measuredIn: 'reps', equipment: ['Dumbbells'] }),
  exercise('rower', { name: 'Rowing machine', equipment: ['Rower'] }),
  exercise('treadmill', { name: 'Treadmill walk', equipment: ['Treadmill'] }),
  exercise('squat', { name: 'Back Squat', type: 'resistance', measuredIn: 'reps', equipment: ['Barbell'] }),
  exercise('plank', { name: 'Plank', type: 'resistance' }),
  exercise('pushUp', { name: 'Push-Up', type: 'resistance', measuredIn: 'reps' }),
  exercise('burpee', { name: 'Burpee', type: 'resistance', measuredIn: 'reps' }),
];

function session(segments: CardioSession['segments']): CardioSession {
  return { id: 'c', originId: 'c', name: 'Cardio', segments };
}

describe('CARDIO_INTENSITY_TEXT', () => {
  it('describes each intensity with the talk test', () => {
    // assert
    expect(CARDIO_INTENSITY_TEXT).toEqual({
      easy: 'You can hold a conversation',
      moderate: 'You can talk, but not sing',
      hard: 'Hard: only a few words at a time',
    });
  });
});

describe('cardioPreset', () => {
  it('builds easy cardio as thirty easy minutes on the first walk, bike or elliptical cardio exercise', () => {
    // act
    const preset = cardioPreset('liss', LIBRARY);

    // assert
    expect(preset.name).toBe('Easy cardio');
    expect(preset.originId).toBe(preset.id);
    expect(preset.segments).toEqual([
      { id: expect.any(String), exerciseId: 'treadmill', plan: { kind: 'steady', minutes: 30, intensity: 'easy' } },
    ]);
  });

  it('falls back to the first cardio exercise when none matches', () => {
    // act
    const preset = cardioPreset('liss', LIBRARY.filter(item => item.id !== 'treadmill'));

    // assert
    expect(preset.segments[0].exerciseId).toBe('rower');
  });

  it('builds moderate cardio as twenty-five moderate minutes', () => {
    // act
    const preset = cardioPreset('moderate', LIBRARY);

    // assert
    expect(preset.name).toBe('Moderate cardio');
    expect(preset.segments.map(segment => segment.plan)).toEqual([{ kind: 'steady', minutes: 25, intensity: 'moderate' }]);
  });

  it('builds intervals between an easy warm-up and cool-down', () => {
    // act
    const preset = cardioPreset('hiit', LIBRARY);

    // assert
    expect(preset.name).toBe('Intervals');
    expect(preset.segments.map(segment => segment.plan)).toEqual([
      { kind: 'steady', minutes: 5, intensity: 'easy' },
      { kind: 'intervals', workSeconds: 30, easySeconds: 90, rounds: 8, intensity: 'hard' },
      { kind: 'steady', minutes: 5, intensity: 'easy' },
    ]);
  });

  it('builds a finisher circuit from the first two bodyweight resistance exercises', () => {
    // act
    const preset = cardioPreset('finisher', LIBRARY);

    // assert
    expect(preset.name).toBe('Finisher');
    expect(preset.segments.map(segment => segment.plan)).toEqual([
      {
        kind: 'circuit',
        items: [
          { exerciseId: 'plank', seconds: 30 },
          { exerciseId: 'pushUp', seconds: 30 },
        ],
        rounds: 3,
        restSeconds: 60,
      },
    ]);
  });

  it('gives each preset fresh ids', () => {
    // act
    const [first, second] = [cardioPreset('liss', LIBRARY), cardioPreset('liss', LIBRARY)];

    // assert
    expect(first.id).not.toBe(second.id);
    expect(first.segments[0].id).not.toBe(second.segments[0].id);
  });
});

describe('cardioMinutes', () => {
  it.each([
    ['liss', 30],
    ['moderate', 25],
    ['hiit', 26],
    ['finisher', 5],
  ] as const)('adds up the %s preset to %i minutes', (kind, minutes) => {
    // act
    const total = cardioMinutes(cardioPreset(kind, LIBRARY));

    // assert
    expect(total).toBe(minutes);
  });

  it('counts three seconds a rep for circuit items without seconds', () => {
    // arrange
    const circuit = session([
      { id: 's', exerciseId: 'burpee', plan: { kind: 'circuit', items: [{ exerciseId: 'burpee', reps: 20 }], rounds: 4, restSeconds: 60 } },
    ]);

    // act
    const total = cardioMinutes(circuit);

    // assert
    expect(total).toBe(7);
  });
});

describe('cardio character', () => {
  it('treats only all-steady, all-easy sessions as light', () => {
    // act
    const verdicts = (['liss', 'moderate', 'hiit', 'finisher'] as const).map(kind => isLightCardio(cardioPreset(kind, LIBRARY)));

    // assert
    expect(verdicts).toEqual([true, false, false, false]);
  });

  it('spots sessions with an intervals segment', () => {
    // act
    const verdicts = (['liss', 'moderate', 'hiit', 'finisher'] as const).map(kind => hasIntervals(cardioPreset(kind, LIBRARY)));

    // assert
    expect(verdicts).toEqual([false, false, true, false]);
  });
});

describe('cardioEdits', () => {
  it('starts an empty session named Cardio', () => {
    // act
    const empty = emptyCardioSession();

    // assert
    expect(empty).toEqual({ id: empty.id, originId: empty.id, name: 'Cardio', segments: [] });
  });

  it('applies a preset while keeping the session identity', () => {
    // arrange
    const empty = emptyCardioSession();

    // act
    const next = cardioEdits(empty, LIBRARY).applyPreset('hiit');

    // assert
    expect(next.id).toBe(empty.id);
    expect(next.originId).toBe(empty.originId);
    expect(next.name).toBe('Intervals');
    expect(cardioMinutes(next)).toBe(26);
  });

  it('adds each kind of segment with editable defaults', () => {
    // arrange
    const edits = cardioEdits(emptyCardioSession(), LIBRARY);

    // act
    const kinds = (['steady', 'intervals', 'circuit'] as const).map(kind => edits.addSegment(kind).segments[0]);

    // assert
    expect(kinds.map(segment => segment.plan)).toEqual([
      { kind: 'steady', minutes: 10, intensity: 'moderate' },
      { kind: 'intervals', workSeconds: 30, easySeconds: 90, rounds: 6, intensity: 'hard' },
      { kind: 'circuit', items: [], rounds: 3, restSeconds: 60 },
    ]);
    expect(kinds[0].exerciseId).toBe('treadmill');
  });

  it('replaces the exercise, changes the plan, reorders and removes segments', () => {
    // arrange
    const start = session([
      { id: 's1', exerciseId: 'treadmill', plan: { kind: 'steady', minutes: 5, intensity: 'easy' } },
      { id: 's2', exerciseId: 'treadmill', plan: { kind: 'steady', minutes: 20, intensity: 'moderate' } },
    ]);

    // act
    const replaced = cardioEdits(start, LIBRARY).replaceExercise('s2', 'rower');
    const planned = cardioEdits(replaced, LIBRARY).changePlan('s2', { kind: 'steady', minutes: 25, intensity: 'hard' });
    const moved = cardioEdits(planned, LIBRARY).moveUp('s2');
    const dragged = cardioEdits(moved, LIBRARY).moveBefore('s1', 's2');
    const removed = cardioEdits(dragged, LIBRARY).remove('s1');

    // assert
    expect(moved.segments.map(segment => [segment.id, segment.exerciseId])).toEqual([
      ['s2', 'rower'],
      ['s1', 'treadmill'],
    ]);
    expect(moved.segments[0].plan).toEqual({ kind: 'steady', minutes: 25, intensity: 'hard' });
    expect(dragged.segments.map(segment => segment.id)).toEqual(['s1', 's2']);
    expect(removed.segments.map(segment => segment.id)).toEqual(['s2']);
  });

  it('adds circuit exercises by reps or seconds and keeps the first as the segment exercise', () => {
    // arrange
    const start = session([{ id: 'c1', exerciseId: '', plan: { kind: 'circuit', items: [], rounds: 3, restSeconds: 60 } }]);

    // act
    const withPushUp = cardioEdits(start, LIBRARY).addCircuitItem('c1', 'pushUp');
    const withPlank = cardioEdits(withPushUp, LIBRARY).addCircuitItem('c1', 'plank');
    const removed = cardioEdits(withPlank, LIBRARY).removeCircuitItem('c1', 0);

    // assert
    expect(withPlank.segments[0]).toEqual({
      id: 'c1',
      exerciseId: 'pushUp',
      plan: { kind: 'circuit', items: [{ exerciseId: 'pushUp', reps: 12 }, { exerciseId: 'plank', seconds: 30 }], rounds: 3, restSeconds: 60 },
    });
    expect(removed.segments[0].exerciseId).toBe('plank');
  });

  it('adds a dropped cardio exercise as a steady segment', () => {
    // act
    const next = cardioEdits(emptyCardioSession(), LIBRARY).addSteady('rower');

    // assert
    expect(next.segments.map(segment => [segment.exerciseId, segment.plan])).toEqual([['rower', { kind: 'steady', minutes: 10, intensity: 'moderate' }]]);
  });
});
