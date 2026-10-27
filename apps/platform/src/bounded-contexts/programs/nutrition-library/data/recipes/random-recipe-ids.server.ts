import { randomUUID } from "node:crypto";

import type { RecipeIds } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomRecipeIds implements RecipeIds {
  generate(): string {
    return randomUUID();
  }
}
