import type { Food } from "./food";
import type { FoodLibrary } from "./food-library";
import type { NutritionTag, NutritionTags } from "./nutrition-tags";

export type ListFoodsResult = {
  status: "listed";
  foods: Food[];
  tags: NutritionTag[];
};

type ListFoodsUseCaseOptions = {
  library: Pick<FoodLibrary, "list">;
  tags: Pick<NutritionTags, "list">;
};

export class ListFoodsUseCase {
  constructor(private readonly options: ListFoodsUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<ListFoodsResult> {
    const [foods, tags] = await Promise.all([
      this.options.library.list(ownerAccountId),
      this.options.tags.list(),
    ]);

    return { status: "listed", foods, tags };
  }
}
