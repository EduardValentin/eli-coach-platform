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
  RECIPE_PHOTO_RENDITION,
  RecipePhotoSaving,
  StartRecipeUseCase,
  type RecipePhotoRenditionsPort,
  type RecipePhotoStorePort,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import type { ClockPort } from "~/bounded-contexts/programs/nutrition-library/domain/clock-port";

import { FoodLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/food-library-controller.server";
import { RecipeLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/recipe-library-controller.server";
import { PostgresFoodLibraryRepository } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/foods/postgres-food-library-repository.server";
import { RandomFoodIdsAdapter } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/foods/random-food-ids-adapter.server";
import { RandomRecipeIdsAdapter } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/random-recipe-ids-adapter.server";
import { RandomRecipePhotoIdsAdapter } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/random-recipe-photo-ids-adapter.server";
import { PostgresRecipeLibraryRepository } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/recipes/postgres-recipe-library-repository.server";
import { PostgresNutritionTagsRepository } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/tags/postgres-nutrition-tags-repository.server";
import type { NutritionLibraryFeature } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { NutritionLibraryIncidentsAdapter } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/logging/nutrition-library-incidents-adapter.server";
import { createRecipePhotoRenditionsAdapter } from "./adapters/outbound/persistence/create-recipe-photo-renditions-adapter.server";
import { createRecipePhotoStoreAdapter } from "~/bounded-contexts/programs/nutrition-library/adapters/outbound/persistence/create-recipe-photo-store-adapter.server";
import type { RecipePhotosConfig } from "~/bounded-contexts/programs/nutrition-library/config.server";

type RecipePhotoFiles = {
  photoRenditions: RecipePhotoRenditionsPort;
  photoStore: RecipePhotoStorePort;
};

type NutritionLibraryFeatureHandles = RecipePhotoFiles & {
  clock: ClockPort;
  database: DatabaseClient;
  logger: LoggerPort;
};

export function composeNutritionLibraryFeature(
  handles: NutritionLibraryFeatureHandles,
): NutritionLibraryFeature {
  const incidents = new NutritionLibraryIncidentsAdapter(handles.logger);
  const library = new PostgresFoodLibraryRepository(handles.database);
  const recipes = new PostgresRecipeLibraryRepository(handles.database);
  const tags = new PostgresNutritionTagsRepository(handles.database);
  const writeHandles = { clock: handles.clock, incidents };
  const recipeReads = { recipes, foods: library, tags };
  const photos = new RecipePhotoSaving({
    renditions: handles.photoRenditions,
    ids: new RandomRecipePhotoIdsAdapter(),
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
        ids: new RandomFoodIdsAdapter(),
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
        ids: new RandomRecipeIdsAdapter(),
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

export function composeRecipePhotoFiles(
  config: RecipePhotosConfig,
): RecipePhotoFiles {
  return {
    photoRenditions: createRecipePhotoRenditionsAdapter(RECIPE_PHOTO_RENDITION),
    photoStore: createRecipePhotoStoreAdapter(config.RECIPE_PHOTO_ROOT),
  };
}
