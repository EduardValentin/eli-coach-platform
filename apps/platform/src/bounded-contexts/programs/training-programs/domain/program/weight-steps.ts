import type { Equipment, LibraryExercise } from "./library-exercise";

export type WeightStep = { lightestKg: number; incrementKg: number };

const BARBELL_STEP: WeightStep = { lightestKg: 20, incrementKg: 5 };
const DUMBBELL_STEP: WeightStep = { lightestKg: 0, incrementKg: 1 };
const KETTLEBELL_STEP: WeightStep = { lightestKg: 0, incrementKg: 4 };
export const PLATE_STEP: WeightStep = { lightestKg: 0, incrementKg: 2.5 };

const STEP_BY_EQUIPMENT: readonly [Equipment, WeightStep][] = [
  ["Barbell", BARBELL_STEP],
  ["Dumbbells", DUMBBELL_STEP],
  ["Kettlebell", KETTLEBELL_STEP],
];

const LOAD_EQUIPMENT: readonly Equipment[] = [
  "Barbell",
  "Dumbbells",
  "Kettlebell",
  "EZ bar",
  "Trap bar",
  "Cable",
  "Machine",
  "Smith machine",
];

// Tolerates float drift such as 52.49999 so a reachable load is not skipped.
const EPSILON = 1e-6;

export class WeightSteps {
  /** An exercise missing from the library loads in plate steps. */
  static stepOf(exercise: LibraryExercise | undefined): WeightStep {
    return exercise ? WeightSteps.stepFor(exercise.equipment) : PLATE_STEP;
  }

  static takesLoad(equipment: readonly Equipment[]): boolean {
    return equipment.some((kind) => LOAD_EQUIPMENT.includes(kind));
  }

  static nextLoadUp(weightKg: number, step: WeightStep): number {
    if (weightKg < step.lightestKg - EPSILON) return step.lightestKg;

    return WeightSteps.loadAt(step, WeightSteps.stepsBelow(step, weightKg) + 1);
  }

  static reachableLoadDown(weightKg: number, step: WeightStep): number {
    return WeightSteps.loadAt(
      step,
      Math.max(0, WeightSteps.stepsBelow(step, weightKg)),
    );
  }

  static nearestLoad(weightKg: number, step: WeightStep): number {
    const steps = Math.round((weightKg - step.lightestKg) / step.incrementKg);

    return WeightSteps.loadAt(step, Math.max(0, steps));
  }

  private static stepFor(equipment: readonly Equipment[]): WeightStep {
    return (
      STEP_BY_EQUIPMENT.find(([kind]) => equipment.includes(kind))?.[1] ??
      PLATE_STEP
    );
  }

  private static loadAt(
    { lightestKg, incrementKg }: WeightStep,
    steps: number,
  ): number {
    return Math.round((lightestKg + steps * incrementKg) * 100) / 100;
  }

  private static stepsBelow(step: WeightStep, weightKg: number): number {
    return Math.floor(
      (weightKg - step.lightestKg) / step.incrementKg + EPSILON,
    );
  }
}
