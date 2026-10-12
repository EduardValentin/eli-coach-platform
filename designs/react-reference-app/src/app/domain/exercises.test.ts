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
  it('offers three types, three units, three difficulties and three tags', () => {
    // assert
    expect(EXERCISE_TYPES).toEqual(['resistance', 'cardio', 'mobility']);
    expect(MEASURES).toEqual(['reps', 'time', 'distance']);
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
  it('measures resistance in reps and cardio and mobility in time', () => {
    // act
    const resistance = defaultMeasureFor('resistance');
    const cardio = defaultMeasureFor('cardio');
    const mobility = defaultMeasureFor('mobility');

    // assert
    expect(resistance).toBe('reps');
    expect(cardio).toBe('time');
    expect(mobility).toBe('time');
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
