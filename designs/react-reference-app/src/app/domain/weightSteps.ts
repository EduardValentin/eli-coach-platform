import type { Exercise } from '../context/TrainingContext';
import type { Equipment } from './exercises';

export type WeightStep = { lightestKg: number; incrementKg: number };

const BARBELL_STEP: WeightStep = { lightestKg: 20, incrementKg: 5 };
const DUMBBELL_STEP: WeightStep = { lightestKg: 0, incrementKg: 1 };
const KETTLEBELL_STEP: WeightStep = { lightestKg: 0, incrementKg: 4 };
export const PLATE_STEP: WeightStep = { lightestKg: 0, incrementKg: 2.5 };

const STEP_BY_EQUIPMENT: readonly [Equipment, WeightStep][] = [
  ['Barbell', BARBELL_STEP],
  ['Dumbbells', DUMBBELL_STEP],
  ['Kettlebell', KETTLEBELL_STEP],
];

const LOAD_EQUIPMENT: readonly Equipment[] = [
  'Barbell',
  'Dumbbells',
  'Kettlebell',
  'EZ bar',
  'Trap bar',
  'Cable',
  'Machine',
  'Smith machine',
];

// Tolerates float drift such as 52.49999 so a reachable load is not skipped.
const EPSILON = 1e-6;

export function weightStepFor(equipment: readonly Equipment[]): WeightStep {
  return STEP_BY_EQUIPMENT.find(([kind]) => equipment.includes(kind))?.[1] ?? PLATE_STEP;
}

/** An exercise missing from the library loads in plate steps. */
export function weightStepOf(exercise: Exercise | undefined): WeightStep {
  return exercise ? weightStepFor(exercise.equipment) : PLATE_STEP;
}

export function takesLoad(equipment: readonly Equipment[]): boolean {
  return equipment.some(kind => LOAD_EQUIPMENT.includes(kind));
}

function loadAt({ lightestKg, incrementKg }: WeightStep, steps: number): number {
  return Math.round((lightestKg + steps * incrementKg) * 100) / 100;
}

function stepsBelow(step: WeightStep, weightKg: number): number {
  return Math.floor((weightKg - step.lightestKg) / step.incrementKg + EPSILON);
}

export function nextLoadUp(weightKg: number, step: WeightStep): number {
  if (weightKg < step.lightestKg - EPSILON) return step.lightestKg;
  return loadAt(step, stepsBelow(step, weightKg) + 1);
}

export function reachableLoadDown(weightKg: number, step: WeightStep): number {
  return loadAt(step, Math.max(0, stepsBelow(step, weightKg)));
}

export function nearestLoad(weightKg: number, step: WeightStep): number {
  const steps = Math.round((weightKg - step.lightestKg) / step.incrementKg);
  return loadAt(step, Math.max(0, steps));
}
