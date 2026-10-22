import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import type { CardioSegment, CardioSession, RoundsSegment } from './program';
import { CARDIO_INTENSITY_TEXT, cardioEdits, cardioMinutes, cardioPreset, emptyCardioSession, hasHardRounds, isLightCardio, roundsText, segmentMinutes } from './programCardio';

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
  exercise('pushUp', { name: 'Push-Up', type: 'resistance', measuredIn: 'reps', tags: ['Conditioning', 'Hypertrophy'] }),
  exercise('burpee', { name: 'Burpee', type: 'resistance', measuredIn: 'reps', tags: ['Conditioning'] }),
  exercise('jacks', { name: 'Jumping Jacks', type: 'resistance', tags: ['Conditioning'] }),
  exercise('climber', { name: 'Mountain Climber', type: 'resistance', tags: ['Conditioning'] }),
];

const AN_ID = expect.any(String);

function session(segments: CardioSession['segments']): CardioSession {
  return { id: 'c', originId: 'c', name: 'Cardio', segments };
}

function rounds(overrides: Partial<RoundsSegment> = {}): RoundsSegment {
  return { id: 'r', kind: 'rounds', items: [], easySeconds: 0, restBetweenRoundsSeconds: 60, rounds: 3, intensity: 'hard', ...overrides };
}

function withoutIds(segment: CardioSegment) {
  if (segment.kind === 'steady') return { ...segment, id: undefined };
  return { ...segment, id: undefined, items: segment.items.map(item => ({ ...item, id: undefined })) };
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
    expect(preset.segments).toEqual([{ id: AN_ID, kind: 'steady', exerciseId: 'treadmill', minutes: 30, intensity: 'easy' }]);
  });

  it('falls back to the first cardio exercise when none matches', () => {
    // act
    const preset = cardioPreset('liss', LIBRARY.filter(item => item.id !== 'treadmill'));

    // assert
    expect(preset.segments[0]).toMatchObject({ exerciseId: 'rower' });
  });

  it('builds moderate cardio as twenty-five moderate minutes', () => {
    // act
    const preset = cardioPreset('moderate', LIBRARY);

    // assert
    expect(preset.name).toBe('Moderate cardio');
    expect(preset.segments.map(withoutIds)).toEqual([{ kind: 'steady', exerciseId: 'treadmill', minutes: 25, intensity: 'moderate' }]);
  });

  it('builds eight hard rounds of thirty seconds on the first conditioning or cardio exercise between an easy warm-up and cool-down', () => {
    // act
    const preset = cardioPreset('hiit', LIBRARY);

    // assert
    expect(preset.name).toBe('Intervals');
    expect(preset.segments.map(withoutIds)).toEqual([
      { kind: 'steady', exerciseId: 'treadmill', minutes: 5, intensity: 'easy' },
      {
        kind: 'rounds',
        items: [{ exerciseId: 'rower', workSeconds: 30 }],
        easySeconds: 90,
        restBetweenRoundsSeconds: 0,
        rounds: 8,
        intensity: 'hard',
      },
      { kind: 'steady', exerciseId: 'treadmill', minutes: 5, intensity: 'easy' },
    ]);
  });

  it('builds a finisher as three rounds of the first three conditioning exercises', () => {
    // act
    const preset = cardioPreset('finisher', LIBRARY);

    // assert
    expect(preset.name).toBe('Finisher');
    expect(preset.segments.map(withoutIds)).toEqual([
      {
        kind: 'rounds',
        items: [
          { exerciseId: 'pushUp', workSeconds: 30 },
          { exerciseId: 'burpee', workSeconds: 30 },
          { exerciseId: 'jacks', workSeconds: 30 },
        ],
        easySeconds: 0,
        restBetweenRoundsSeconds: 60,
        rounds: 3,
        intensity: 'hard',
      },
    ]);
  });

  it('gives each preset fresh ids', () => {
    // act
    const [first, second] = [cardioPreset('finisher', LIBRARY), cardioPreset('finisher', LIBRARY)];

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
    ['finisher', 7],
  ] as const)('adds up the %s preset to %i minutes', (kind, minutes) => {
    // act
    const total = cardioMinutes(cardioPreset(kind, LIBRARY));

    // assert
    expect(total).toBe(minutes);
  });

  it('counts three seconds a rep, the easy time after every exercise and the rest between rounds', () => {
    // arrange
    const items = [
      { id: 'i1', exerciseId: 'burpee', reps: 10 },
      { id: 'i2', exerciseId: 'jacks', workSeconds: 40 },
    ];
    const cardio = session([rounds({ items, easySeconds: 20, restBetweenRoundsSeconds: 60, rounds: 2 })]);

    // act
    const total = cardioMinutes(cardio);

    // assert
    expect(total).toBe(5);
  });

  it('counts the easy time after a single exercise in every round', () => {
    // arrange
    const items = [{ id: 'i1', exerciseId: 'jacks', workSeconds: 30 }];
    const segment = rounds({ items, easySeconds: 90, restBetweenRoundsSeconds: 0, rounds: 8 });

    // act
    const [total, own] = [cardioMinutes(session([segment])), segmentMinutes(segment)];

    // assert
    expect(total).toBe(16);
    expect(own).toBe(16);
  });
});

describe('cardio character', () => {
  it('treats only all-steady, all-easy sessions as light', () => {
    // act
    const verdicts = (['liss', 'moderate', 'hiit', 'finisher'] as const).map(kind => isLightCardio(cardioPreset(kind, LIBRARY)));

    // assert
    expect(verdicts).toEqual([true, false, false, false]);
  });

  it('spots sessions with hard rounds', () => {
    // arrange
    const easyRounds = session([rounds({ intensity: 'moderate' })]);

    // act
    const verdicts = (['liss', 'moderate', 'hiit', 'finisher'] as const).map(kind => hasHardRounds(cardioPreset(kind, LIBRARY)));

    // assert
    expect(verdicts).toEqual([false, false, true, true]);
    expect(hasHardRounds(easyRounds)).toBe(false);
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
    const kinds = (['steady', 'rounds'] as const).map(kind => edits.addSegment(kind).segments[0]);

    // assert
    expect(kinds.map(withoutIds)).toEqual([
      { kind: 'steady', exerciseId: 'treadmill', minutes: 10, intensity: 'moderate' },
      { kind: 'rounds', items: [], easySeconds: 0, restBetweenRoundsSeconds: 60, rounds: 3, intensity: 'hard' },
    ]);
  });

  it('replaces the exercise, changes the segment, reorders and removes segments', () => {
    // arrange
    const start = session([
      { id: 's1', kind: 'steady', exerciseId: 'treadmill', minutes: 5, intensity: 'easy' },
      { id: 's2', kind: 'steady', exerciseId: 'treadmill', minutes: 20, intensity: 'moderate' },
    ]);

    // act
    const replaced = cardioEdits(start, LIBRARY).replaceExercise('s2', 'rower');
    const changed = cardioEdits(replaced, LIBRARY).changeSegment({ id: 's2', kind: 'steady', exerciseId: 'rower', minutes: 25, intensity: 'hard' });
    const moved = cardioEdits(changed, LIBRARY).moveUp('s2');
    const dragged = cardioEdits(moved, LIBRARY).moveBefore('s1', 's2');
    const removed = cardioEdits(dragged, LIBRARY).remove('s1');

    // assert
    expect(moved.segments).toEqual([
      { id: 's2', kind: 'steady', exerciseId: 'rower', minutes: 25, intensity: 'hard' },
      { id: 's1', kind: 'steady', exerciseId: 'treadmill', minutes: 5, intensity: 'easy' },
    ]);
    expect(dragged.segments.map(segment => segment.id)).toEqual(['s1', 's2']);
    expect(removed.segments.map(segment => segment.id)).toEqual(['s2']);
  });

  it('adds round exercises by reps or work seconds, changes and removes them', () => {
    // arrange
    const start = session([rounds()]);

    // act
    const withPushUp = cardioEdits(start, LIBRARY).addRoundsItem('r', 'pushUp');
    const withPlank = cardioEdits(withPushUp, LIBRARY).addRoundsItem('r', 'plank');
    const [pushUp, plank] = (withPlank.segments[0] as RoundsSegment).items;
    const changed = cardioEdits(withPlank, LIBRARY).changeRoundsItem('r', { ...plank, workSeconds: 45 });
    const removed = cardioEdits(changed, LIBRARY).removeRoundsItem('r', pushUp.id);

    // assert
    expect([pushUp, plank]).toEqual([
      { id: AN_ID, exerciseId: 'pushUp', reps: 12 },
      { id: AN_ID, exerciseId: 'plank', workSeconds: 30 },
    ]);
    expect((removed.segments[0] as RoundsSegment).items).toEqual([{ ...plank, workSeconds: 45 }]);
  });

  it('reorders round exercises', () => {
    // arrange
    const items = [
      { id: 'i1', exerciseId: 'burpee', reps: 10 },
      { id: 'i2', exerciseId: 'jacks', workSeconds: 30 },
      { id: 'i3', exerciseId: 'climber', workSeconds: 30 },
    ];
    const start = session([rounds({ items })]);
    const order = (cardio: CardioSession) => (cardio.segments[0] as RoundsSegment).items.map(item => item.id);

    // act
    const up = cardioEdits(start, LIBRARY).moveRoundsItemUp('r', 'i3');
    const down = cardioEdits(start, LIBRARY).moveRoundsItemDown('r', 'i1');
    const pastTheEnd = cardioEdits(start, LIBRARY).moveRoundsItemDown('r', 'i3');

    // assert
    expect(order(up)).toEqual(['i1', 'i3', 'i2']);
    expect(order(down)).toEqual(['i2', 'i1', 'i3']);
    expect(pastTheEnd).toEqual(start);
  });

  it('adds a dropped cardio exercise as a steady segment', () => {
    // act
    const next = cardioEdits(emptyCardioSession(), LIBRARY).addSteady('rower');

    // assert
    expect(next.segments.map(withoutIds)).toEqual([{ kind: 'steady', exerciseId: 'rower', minutes: 10, intensity: 'moderate' }]);
  });
});

describe('roundsText', () => {
  it('reads the round count and each exercise with its work seconds or reps', () => {
    // arrange
    const segment = rounds({ rounds: 4, items: [{ id: 'i1', exerciseId: 'burpee', reps: 10 }, { id: 'i2', exerciseId: 'jacks', workSeconds: 30 }] });

    // act
    const text = roundsText(segment, id => LIBRARY.find(item => item.id === id)?.name ?? '');

    // assert
    expect(text).toBe('4 rounds · Burpee 10 reps, Jumping Jacks 30 s');
  });
});
