import { randomUUID } from "node:crypto";

import type { RecipePhotoIdsPort } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomRecipePhotoIdsAdapter implements RecipePhotoIdsPort {
  generate(): string {
    return randomUUID();
  }
}
