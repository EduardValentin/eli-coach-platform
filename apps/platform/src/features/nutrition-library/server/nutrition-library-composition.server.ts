import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  CreateFoodUseCase,
  EditFoodUseCase,
  FindFoodUseCase,
  ListFoodsUseCase,
  type NutritionLibraryIncidents,
} from "@eli-coach-platform/domain/nutrition";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { FoodLibraryController } from "~/features/nutrition-library/api/coach/food-library-controller.server";
import { PostgresFoodLibrary } from "~/features/nutrition-library/data/foods/food-library-repository.server";
import { RandomFoodIds } from "~/features/nutrition-library/data/foods/random-food-ids.server";
import { PostgresNutritionTags } from "~/features/nutrition-library/data/tags/nutrition-tags-repository.server";

export type NutritionLibraryFeature = {
  foodLibrary: FoodLibraryController;
};

type NutritionLibraryFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  incidents: NutritionLibraryIncidents;
};

export function composeNutritionLibraryFeature(
  handles: NutritionLibraryFeatureHandles,
): NutritionLibraryFeature {
  const library = new PostgresFoodLibrary(handles.database);
  const tags = new PostgresNutritionTags(handles.database);
  const foodWriteDependencies = {
    library,
    tags,
    clock: handles.clock,
    incidents: handles.incidents,
  };

  return {
    foodLibrary: new FoodLibraryController({
      listFoods: new ListFoodsUseCase({ library, tags }),
      findFood: new FindFoodUseCase({ library, tags }),
      createFood: new CreateFoodUseCase({
        ...foodWriteDependencies,
        ids: new RandomFoodIds(),
      }),
      editFood: new EditFoodUseCase(foodWriteDependencies),
    }),
  };
}
