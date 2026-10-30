import { randomUUID } from "node:crypto";

import type { ExerciseIdsPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

export class RandomExerciseIdsAdapter implements ExerciseIdsPort {
  generate(): string {
    return randomUUID();
  }
}
