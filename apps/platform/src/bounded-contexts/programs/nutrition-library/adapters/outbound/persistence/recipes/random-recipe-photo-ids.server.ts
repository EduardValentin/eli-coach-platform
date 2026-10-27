import { randomUUID } from "node:crypto";

import type { RecipePhotoIds } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomRecipePhotoIds implements RecipePhotoIds {
  generate(): string {
    return randomUUID();
  }
}
