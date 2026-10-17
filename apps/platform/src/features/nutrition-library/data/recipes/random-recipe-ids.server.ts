import { randomUUID } from "node:crypto";

import type { RecipeIds } from "@eli-coach-platform/domain/nutrition";

export class RandomRecipeIds implements RecipeIds {
  generate(): string {
    return randomUUID();
  }
}
