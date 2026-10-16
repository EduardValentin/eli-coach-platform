import type { Food } from "./food";
import type { FoodLibrary, FoodReference } from "./food-library";
import type { NutritionTag, NutritionTags } from "./nutrition-tags";

export type FindFoodResult =
  | {
      status: "found";
      food: Food;
      otherNames: string[];
      tags: NutritionTag[];
    }
  | { status: "not-found" };

type FindFoodUseCaseOptions = {
  library: Pick<FoodLibrary, "list">;
  tags: Pick<NutritionTags, "list">;
};

export class FindFoodUseCase {
  constructor(private readonly options: FindFoodUseCaseOptions) {}

  async execute(reference: FoodReference): Promise<FindFoodResult> {
    const { library, tags } = this.options;
    const [foods, vocabulary] = await Promise.all([
      library.list(reference.ownerAccountId),
      tags.list(),
    ]);
    const food = foods.find(({ id }) => id === reference.foodId);

    if (!food) return { status: "not-found" };

    return {
      status: "found",
      food,
      otherNames: foods
        .filter(({ id }) => id !== reference.foodId)
        .map(({ name }) => name),
      tags: vocabulary,
    };
  }
}
