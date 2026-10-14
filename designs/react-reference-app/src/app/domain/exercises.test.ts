import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  MEASURES,
  MUSCLES,
  defaultMeasureFor,
  draftProblems,
  isValidDraft,
  measureAllowedFor,
  measuresFor,
  needsEquipment,
  withPrimaryMuscleToggled,
  type ExerciseDraft,
} from './exercises';

const squat: ExerciseDraft = {
  name: 'Back squat',
  type: 'resistance',
  measuredIn: 'reps',
  perSide: false,
  primaryMuscles: ['Quadriceps', 'Glutes'],
  secondaryMuscles: ['Core'],
  equipment: ['Barbell', 'Squat rack'],
  difficulty: 'Intermediate',
  tags: ['Strength'],
  cues: '',
};

describe('the exercise vocabularies', () => {
  it('offers five types, four units, three difficulties and three tags', () => {
    // assert
    expect(EXERCISE_TYPES).toEqual(['resistance', 'cardio', 'mobility', 'stretching', 'breathing']);
    expect(MEASURES).toEqual(['reps', 'time', 'distance', 'breaths']);
    expect(DIFFICULTIES).toEqual(['Beginner', 'Intermediate', 'Advanced']);
    expect(EXERCISE_TAGS).toEqual(['Strength', 'Hypertrophy', 'Recovery']);
  });

  it('lists nineteen muscles ending with Full body and twenty-three pieces of equipment without Bodyweight', () => {
    // assert
    expect(MUSCLES).toHaveLength(19);
    expect(MUSCLES).toContain('Full body');
    expect(EQUIPMENT).toHaveLength(23);
    expect(EQUIPMENT).not.toContain('Bodyweight');
  });
});

describe('the default unit', () => {
  it('is the first unit each type allows', () => {
    // act
    const defaults = EXERCISE_TYPES.map((type) => defaultMeasureFor(type));

    // assert
    expect(defaults).toEqual(['reps', 'time', 'time', 'time', 'breaths']);
  });
});

describe('measuresFor', () => {
  it('lists the units each type allows, default first', () => {
    // act
    const lists = EXERCISE_TYPES.map((type) => measuresFor(type));

    // assert
    expect(lists).toEqual([
      ['reps', 'time', 'distance'],
      ['time', 'distance'],
      ['time', 'reps'],
      ['time'],
      ['breaths', 'time'],
    ]);
  });
});

describe('measureAllowedFor', () => {
  it('allows the units a type lists', () => {
    // act
    const distanceForCardio = measureAllowedFor('cardio', 'distance');
    const repsForMobility = measureAllowedFor('mobility', 'reps');
    const breathsForBreathing = measureAllowedFor('breathing', 'breaths');

    // assert
    expect(distanceForCardio).toBe(true);
    expect(repsForMobility).toBe(true);
    expect(breathsForBreathing).toBe(true);
  });

  it('refuses the units a type does not list', () => {
    // act
    const repsForCardio = measureAllowedFor('cardio', 'reps');
    const distanceForStretching = measureAllowedFor('stretching', 'distance');
    const breathsForResistance = measureAllowedFor('resistance', 'breaths');

    // assert
    expect(repsForCardio).toBe(false);
    expect(distanceForStretching).toBe(false);
    expect(breathsForResistance).toBe(false);
  });
});

describe('needsEquipment', () => {
  it('is false for an empty list and true for anything listed', () => {
    // act
    const withNothing = needsEquipment([]);
    const withMat = needsEquipment(['Mat']);

    // assert
    expect(withNothing).toBe(false);
    expect(withMat).toBe(true);
  });
});

describe('draftProblems', () => {
  it('accepts a complete resistance exercise', () => {
    // arrange
    const others: { name: string }[] = [];

    // act
    const problems = draftProblems(squat, others);

    // assert
    expect(problems).toEqual({});
    expect(isValidDraft(problems)).toBe(true);
  });

  it('requires a name', () => {
    // arrange
    const draft = { ...squat, name: '   ' };
    const others: { name: string }[] = [];

    // act
    const problems = draftProblems(draft, others);

    // assert
    expect(problems.name).toBe('Give the exercise a name');
    expect(isValidDraft(problems)).toBe(false);
  });

  it('refuses a name another exercise already uses, ignoring case and surrounding space', () => {
    // arrange
    const draft = { ...squat, name: ' back SQUAT ' };
    const others = [{ name: 'Back squat' }];

    // act
    const problems = draftProblems(draft, others);

    // assert
    expect(problems.name).toBe('An exercise with this name already exists');
  });

  it('requires a primary muscle for resistance and mobility but not for cardio', () => {
    // arrange
    const resistanceDraft = { ...squat, primaryMuscles: [] };
    const mobilityDraft = { ...squat, type: 'mobility' as const, primaryMuscles: [] };
    const cardioDraft = { ...squat, type: 'cardio' as const, primaryMuscles: [] };

    // act
    const resistance = draftProblems(resistanceDraft, []);
    const mobility = draftProblems(mobilityDraft, []);
    const cardio = draftProblems(cardioDraft, []);

    // assert
    expect(resistance.primaryMuscles).toBe('Pick at least one primary muscle');
    expect(mobility.primaryMuscles).toBe('Pick at least one primary muscle');
    expect(cardio.primaryMuscles).toBeUndefined();
  });
});

describe('withPrimaryMuscleToggled', () => {
  it('takes a muscle out of secondary when it becomes primary', () => {
    // act
    const draft = withPrimaryMuscleToggled(squat, 'Core');

    // assert
    expect(draft.primaryMuscles).toEqual(['Quadriceps', 'Glutes', 'Core']);
    expect(draft.secondaryMuscles).toEqual([]);
  });

  it('leaves secondary untouched when a primary muscle is toggled off', () => {
    // act
    const draft = withPrimaryMuscleToggled(squat, 'Glutes');

    // assert
    expect(draft.primaryMuscles).toEqual(['Quadriceps']);
    expect(draft.secondaryMuscles).toEqual(['Core']);
  });
});
