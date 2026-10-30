import { randomUUID } from "node:crypto";

import type { FoodIdsPort } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";

export class RandomFoodIdsAdapter implements FoodIdsPort {
  generate(): string {
    return randomUUID();
  }
}
