import { randomUUID } from "node:crypto";

import type { FoodIds } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomFoodIds implements FoodIds {
  generate(): string {
    return randomUUID();
  }
}
