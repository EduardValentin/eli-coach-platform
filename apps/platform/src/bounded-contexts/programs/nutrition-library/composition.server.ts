import type { DatabaseClient } from "~/shared/database";
import {
  CreateFoodUseCase,
  CreateRecipeUseCase,
  EditFoodUseCase,
  EditRecipeUseCase,
  FindFoodUseCase,
  FindRecipeUseCase,
  ListFoodsUseCase,
  ListRecipesUseCase,
  OpenRecipePhotoUseCase,
  RecipePhotoSaving,
  StartRecipeUseCase,
  type RecipePhotoRenditions,
  type RecipePhotoStore,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import type { Clock } from "~/bounded-contexts/programs/nutrition-library/domain/clock";

import { FoodLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/food-library-controller.server";
import { RecipeLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/recipe-library-controller.server";
import { PostgresFoodLibrary } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/foods/food-library-repository.server";
import { RandomFoodIds } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/foods/random-food-ids.server";
import { RandomRecipeIds } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/random-recipe-ids.server";
import { RandomRecipePhotoIds } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/random-recipe-photo-ids.server";
import { PostgresRecipeLibrary } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/recipe-library-repository.server";
import { PostgresNutritionTags } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/tags/nutrition-tags-repository.server";
import type { NutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import type { Logger } from "~/shared/logging/console-logger.server";
import { createNutritionLibraryIncidents } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/logging/nutrition-library-incidents.server";

type NutritionLibraryFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  logger: Logger;
  photoRenditions: RecipePhotoRenditions;
  photoStore: RecipePhotoStore;
};

export function composeNutritionLibraryFeature(
  handles: NutritionLibraryFeatureHandles,
): NutritionLibraryFeature {
  const incidents = createNutritionLibraryIncidents(handles.logger);
  const library = new PostgresFoodLibrary(handles.database);
  const recipes = new PostgresRecipeLibrary(handles.database);
  const tags = new PostgresNutritionTags(handles.database);
  const writeHandles = { clock: handles.clock, incidents };
  const recipeReads = { recipes, foods: library, tags };
  const photos = new RecipePhotoSaving({
    renditions: handles.photoRenditions,
    ids: new RandomRecipePhotoIds(),
    store: handles.photoStore,
    incidents,
  });

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
        photos,
      }),
      editRecipe: new EditRecipeUseCase({
        ...recipeReads,
        ...writeHandles,
        photos,
      }),
      openRecipePhoto: new OpenRecipePhotoUseCase({
        recipes,
        store: handles.photoStore,
      }),
    }),
  };
}
