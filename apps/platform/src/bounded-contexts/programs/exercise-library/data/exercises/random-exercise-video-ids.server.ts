import { randomUUID } from "node:crypto";

import type { ExerciseVideoIds } from "@eli-coach-platform/domain/exercise";

export class RandomExerciseVideoIds implements ExerciseVideoIds {
  generate(): string {
    return randomUUID();
  }
}
