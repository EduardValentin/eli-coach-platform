import { randomUUID } from "node:crypto";

import type { RecipeIdsPort } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomRecipeIdsAdapter implements RecipeIdsPort {
  generate(): string {
    return randomUUID();
  }
}
