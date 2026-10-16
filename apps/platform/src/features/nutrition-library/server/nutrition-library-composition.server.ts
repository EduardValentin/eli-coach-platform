import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  CreateFoodUseCase,
  CreateRecipeUseCase,
  EditFoodUseCase,
  EditRecipeUseCase,
  FindFoodUseCase,
  FindRecipeUseCase,
  ListFoodsUseCase,
  ListRecipesUseCase,
  StartRecipeUseCase,
  type NutritionLibraryIncidents,
} from "@eli-coach-platform/domain/nutrition";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { FoodLibraryController } from "~/features/nutrition-library/api/coach/food-library-controller.server";
import { RecipeLibraryController } from "~/features/nutrition-library/api/coach/recipe-library-controller.server";
import { PostgresFoodLibrary } from "~/features/nutrition-library/data/foods/food-library-repository.server";
import { RandomFoodIds } from "~/features/nutrition-library/data/foods/random-food-ids.server";
import { RandomRecipeIds } from "~/features/nutrition-library/data/recipes/random-recipe-ids.server";
import { PostgresRecipeLibrary } from "~/features/nutrition-library/data/recipes/recipe-library-repository.server";
import { PostgresNutritionTags } from "~/features/nutrition-library/data/tags/nutrition-tags-repository.server";

export type NutritionLibraryFeature = {
  foodLibrary: FoodLibraryController;
  recipeLibrary: RecipeLibraryController;
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
  const recipes = new PostgresRecipeLibrary(handles.database);
  const tags = new PostgresNutritionTags(handles.database);
  const writeHandles = { clock: handles.clock, incidents: handles.incidents };
  const recipeReads = { recipes, foods: library, tags };

  return {
    foodLibrary: new FoodLibraryController({
      listFoods: new ListFoodsUseCase({ library, tags }),
      findFood: new FindFoodUseCase({ library, tags }),
      createFood: new CreateFoodUseCase({
        library,
        tags,
        ...writeHandles,
        ids: new RandomFoodIds(),
      }),
      editFood: new EditFoodUseCase({ library, tags, ...writeHandles }),
    }),
    recipeLibrary: new RecipeLibraryController({
      listRecipes: new ListRecipesUseCase(recipeReads),
      startRecipe: new StartRecipeUseCase(recipeReads),
      findRecipe: new FindRecipeUseCase(recipeReads),
      createRecipe: new CreateRecipeUseCase({
        ...recipeReads,
        ...writeHandles,
        ids: new RandomRecipeIds(),
      }),
      editRecipe: new EditRecipeUseCase({ ...recipeReads, ...writeHandles }),
    }),
  };
}
