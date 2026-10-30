import type { Food } from "./food";
import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionTag, NutritionTagsPort } from "./nutrition-tags-port";

export type ListFoodsResult = {
  status: "listed";
  foods: Food[];
  tags: NutritionTag[];
};

type ListFoodsUseCaseOptions = {
  library: Pick<FoodLibraryPort, "list">;
  tags: Pick<NutritionTagsPort, "list">;
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
