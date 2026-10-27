import { randomUUID } from "node:crypto";

import type { RecipePhotoIds } from "@eli-coach-platform/domain/nutrition";

export class RandomRecipePhotoIds implements RecipePhotoIds {
  generate(): string {
    return randomUUID();
  }
}
