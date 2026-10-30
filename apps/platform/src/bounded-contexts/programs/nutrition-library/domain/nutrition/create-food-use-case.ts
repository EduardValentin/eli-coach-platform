import type { ClockPort } from "../clock-port";
import { Food } from "./food";
import {
  FoodDraft,
  type FoodDraftInput,
  type FoodDraftProblems,
} from "./food-draft";
import type { FoodIdsPort } from "./food-ids-port";
import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTagsPort } from "./nutrition-tags-port";

type CreateFoodCommand = {
  ownerAccountId: string;
  draft: FoodDraftInput;
};

export type CreateFoodResult =
  | { status: "created"; food: Food }
  | { status: "invalid"; problems: FoodDraftProblems }
  | { status: "failed" };

type CreateFoodUseCaseOptions = {
  library: Pick<FoodLibraryPort, "list" | "add">;
  tags: Pick<NutritionTagsPort, "list">;
  ids: FoodIdsPort;
  clock: ClockPort;
  incidents: Pick<NutritionLibraryIncidentsPort, "foodCreationFailed">;
};

export class CreateFoodUseCase {
  constructor(private readonly options: CreateFoodUseCaseOptions) {}

  async execute(command: CreateFoodCommand): Promise<CreateFoodResult> {
    try {
      return await this.create(command);
    } catch (error) {
      this.options.incidents.foodCreationFailed({ error });

      return { status: "failed" };
    }
  }

  private async create({
    ownerAccountId,
    draft: input,
  }: CreateFoodCommand): Promise<CreateFoodResult> {
    const { library, tags, ids, clock } = this.options;
    const [foods, vocabulary] = await Promise.all([
      library.list(ownerAccountId),
      tags.list(),
    ]);
    const draft = FoodDraft.from(input, {
      otherNames: foods.map(({ name }) => name),
      knownTagIds: vocabulary.map(({ id }) => id),
    });

    if (draft.status === "invalid") return draft;

    const food = Food.added({
      id: ids.generate(),
      ownerAccountId,
      draft: draft.draft,
      at: clock.now(),
    });

    if ((await library.add(food)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", food };
  }
}
