import { randomUUID } from "node:crypto";

import type { ExerciseVideoIds } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

export class RandomExerciseVideoIds implements ExerciseVideoIds {
  generate(): string {
    return randomUUID();
  }
}
