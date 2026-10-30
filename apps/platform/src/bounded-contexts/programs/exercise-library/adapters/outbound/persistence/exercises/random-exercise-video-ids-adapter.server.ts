import { randomUUID } from "node:crypto";

import type { ExerciseVideoIdsPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

export class RandomExerciseVideoIdsAdapter implements ExerciseVideoIdsPort {
  generate(): string {
    return randomUUID();
  }
}
