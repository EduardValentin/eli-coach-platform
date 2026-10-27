import { randomUUID } from "node:crypto";

import type { ExerciseIds } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

export class RandomExerciseIds implements ExerciseIds {
  generate(): string {
    return randomUUID();
  }
}
