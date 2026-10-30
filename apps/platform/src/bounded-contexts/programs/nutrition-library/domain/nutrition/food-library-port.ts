import type { Food } from "./food";

export type FoodAddition = "added" | "name-taken";

export type FoodReplacement = "replaced" | "name-taken";

export type FoodReference = {
  ownerAccountId: string;
  foodId: string;
};

export type FoodsReference = {
  ownerAccountId: string;
  foodIds: readonly string[];
};

export interface FoodLibraryPort {
  list(ownerAccountId: string): Promise<Food[]>;
  find(reference: FoodReference): Promise<Food | null>;
  referenced(reference: FoodsReference): Promise<Food[]>;
  add(food: Food): Promise<FoodAddition>;
  replace(food: Food): Promise<FoodReplacement>;
}
