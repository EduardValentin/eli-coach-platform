import { describe, expect, it } from 'vitest';
import { exercise } from '../../test/programFixtures';
import { PLATE_STEP, nearestLoad, nextLoadUp, reachableLoadDown, takesLoad, weightStepFor, weightStepOf } from './weightSteps';

const BARBELL_STEP = weightStepFor(['Barbell']);
const DUMBBELL_STEP = weightStepFor(['Dumbbells']);
const KETTLEBELL_STEP = weightStepFor(['Kettlebell']);

describe('weightStepFor', () => {
  it.each([
    [['Barbell', 'Squat rack'] as const, { lightestKg: 20, incrementKg: 5 }],
    [['Dumbbells', 'Bench'] as const, { lightestKg: 0, incrementKg: 1 }],
    [['Kettlebell'] as const, { lightestKg: 0, incrementKg: 4 }],
    [['Cable'] as const, PLATE_STEP],
    [['Machine'] as const, PLATE_STEP],
    [['EZ bar'] as const, PLATE_STEP],
    [[] as const, PLATE_STEP],
  ])('derives the step from %j', (equipment, expected) => {
    // act
    const step = weightStepFor(equipment);

    // assert
    expect(step).toEqual(expected);
  });
});

describe('weightStepOf', () => {
  it('takes the step from the exercise equipment, and plate steps for an exercise missing from the library', () => {
    // act
    const steps = [weightStepOf(exercise('squat', { equipment: ['Barbell'] })), weightStepOf(undefined)];

    // assert
    expect(steps).toEqual([BARBELL_STEP, PLATE_STEP]);
  });
});

describe('nextLoadUp', () => {
  it.each([
    [BARBELL_STEP, 40, 45],
    [BARBELL_STEP, 42, 45],
    [BARBELL_STEP, 10, 20],
    [DUMBBELL_STEP, 6, 7],
    [KETTLEBELL_STEP, 8, 12],
    [PLATE_STEP, 50, 52.5],
  ])('goes from %j at %s kg to %s kg', (step, weightKg, expected) => {
    // act
    const next = nextLoadUp(weightKg, step);

    // assert
    expect(next).toBe(expected);
  });
});

describe('reachableLoadDown', () => {
  it.each([
    [BARBELL_STEP, 47.25, 45],
    [BARBELL_STEP, 18, 20],
    [DUMBBELL_STEP, 3.6, 3],
    [KETTLEBELL_STEP, 7.2, 4],
    [PLATE_STEP, 52.49999999, 52.5],
  ])('rounds %s kg on %j down to %s kg', (step, weightKg, expected) => {
    // act
    const lower = reachableLoadDown(weightKg, step);

    // assert
    expect(lower).toBe(expected);
  });
});

describe('nearestLoad', () => {
  it('rounds to the closest reachable load', () => {
    // act
    const loads = [nearestLoad(42.86, BARBELL_STEP), nearestLoad(21.4, BARBELL_STEP), nearestLoad(9.6, DUMBBELL_STEP)];

    // assert
    expect(loads).toEqual([45, 20, 10]);
  });
});

describe('takesLoad', () => {
  it('tells loaded equipment from bodyweight equipment', () => {
    // act
    const answers = [takesLoad(['Dumbbells']), takesLoad(['Pull-up bar']), takesLoad([])];

    // assert
    expect(answers).toEqual([true, false, false]);
  });
});
