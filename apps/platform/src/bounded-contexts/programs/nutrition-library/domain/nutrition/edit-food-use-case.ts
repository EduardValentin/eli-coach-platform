import type { ClockPort } from "../clock-port";
import type { Food } from "./food";
import {
  FoodDraft,
  type FoodDraftInput,
  type FoodDraftProblems,
} from "./food-draft";
import type { FoodLibraryPort, FoodReference } from "./food-library-port";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTagsPort } from "./nutrition-tags-port";

type EditFoodCommand = FoodReference & {
  draft: FoodDraftInput;
};

export type EditFoodResult =
  | { status: "edited"; food: Food }
  | { status: "invalid"; problems: FoodDraftProblems }
  | { status: "not-found" }
  | { status: "failed" };

type EditFoodUseCaseOptions = {
  foodLibraryPort: Pick<FoodLibraryPort, "find" | "list" | "replace">;
  nutritionTagsPort: Pick<NutritionTagsPort, "list">;
  clockPort: ClockPort;
  nutritionLibraryIncidentsPort: Pick<
    NutritionLibraryIncidentsPort,
    "foodEditFailed"
  >;
};

export class EditFoodUseCase {
  constructor(private readonly options: EditFoodUseCaseOptions) {}

  async execute(command: EditFoodCommand): Promise<EditFoodResult> {
    try {
      return await this.edit(command);
    } catch (error) {
      this.options.nutritionLibraryIncidentsPort.foodEditFailed({
        foodId: command.foodId,
        error,
      });

      return { status: "failed" };
    }
  }

  private async edit({
    ownerAccountId,
    foodId,
    draft: input,
  }: EditFoodCommand): Promise<EditFoodResult> {
    const { foodLibraryPort, nutritionTagsPort, clockPort } = this.options;
    const [food, foods, vocabulary] = await Promise.all([
      foodLibraryPort.find({ ownerAccountId, foodId }),
      foodLibraryPort.list(ownerAccountId),
      nutritionTagsPort.list(),
    ]);

    if (!food) return { status: "not-found" };

    const draft = FoodDraft.from(input, {
      otherNames: foods
        .filter(({ id }) => id !== foodId)
        .map(({ name }) => name),
      knownTagIds: vocabulary.map(({ id }) => id),
    });

    if (draft.status === "invalid") return draft;

    const edited = food.revised(draft.draft, clockPort.now());

    if ((await foodLibraryPort.replace(edited)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "edited", food: edited };
  }
}
