import { randomUUID } from "node:crypto";

import type { ExerciseIds } from "@eli-coach-platform/domain/exercise";

export class RandomExerciseIds implements ExerciseIds {
  generate(): string {
    return randomUUID();
  }
}
