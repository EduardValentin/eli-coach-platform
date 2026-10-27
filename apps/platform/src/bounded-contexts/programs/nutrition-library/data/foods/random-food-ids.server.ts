import { randomUUID } from "node:crypto";

import type { FoodIds } from "@eli-coach-platform/domain/nutrition";

export class RandomFoodIds implements FoodIds {
  generate(): string {
    return randomUUID();
  }
}
