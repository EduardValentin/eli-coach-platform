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
  recipePhotoRenditionsPort: RecipePhotoRenditionsPort;
  recipePhotoStorePort: RecipePhotoStorePort;
};

type NutritionLibraryFeatureHandles = RecipePhotoFiles & {
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeNutritionLibraryFeature(
  handles: NutritionLibraryFeatureHandles,
): NutritionLibraryFeature {
  const nutritionLibraryIncidentsAdapter = new NutritionLibraryIncidentsAdapter(
    handles.loggerPort,
  );
  const postgresFoodLibraryRepository = new PostgresFoodLibraryRepository(
    handles.database,
  );
  const postgresRecipeLibraryRepository = new PostgresRecipeLibraryRepository(
    handles.database,
  );
  const postgresNutritionTagsRepository = new PostgresNutritionTagsRepository(
    handles.database,
  );
  const writeHandles = {
    clockPort: handles.clockPort,
    nutritionLibraryIncidentsPort: nutritionLibraryIncidentsAdapter,
  };
  const recipeReads = {
    recipeLibraryPort: postgresRecipeLibraryRepository,
    foodLibraryPort: postgresFoodLibraryRepository,
    nutritionTagsPort: postgresNutritionTagsRepository,
  };
  const photos = new RecipePhotoSaving({
    recipePhotoRenditionsPort: handles.recipePhotoRenditionsPort,
    recipePhotoIdsPort: new RandomRecipePhotoIdsAdapter(),
    recipePhotoStorePort: handles.recipePhotoStorePort,
    nutritionLibraryIncidentsPort: nutritionLibraryIncidentsAdapter,
  });

  return {
    foodLibraryController: new FoodLibraryController({
      listFoodsUseCase: new ListFoodsUseCase({
        foodLibraryPort: postgresFoodLibraryRepository,
        nutritionTagsPort: postgresNutritionTagsRepository,
      }),
      findFoodUseCase: new FindFoodUseCase({
        foodLibraryPort: postgresFoodLibraryRepository,
        nutritionTagsPort: postgresNutritionTagsRepository,
      }),
      createFoodUseCase: new CreateFoodUseCase({
        foodLibraryPort: postgresFoodLibraryRepository,
        nutritionTagsPort: postgresNutritionTagsRepository,
        ...writeHandles,
        foodIdsPort: new RandomFoodIdsAdapter(),
      }),
      editFoodUseCase: new EditFoodUseCase({
        foodLibraryPort: postgresFoodLibraryRepository,
        nutritionTagsPort: postgresNutritionTagsRepository,
        ...writeHandles,
      }),
    }),
    recipeLibraryController: new RecipeLibraryController({
      listRecipesUseCase: new ListRecipesUseCase(recipeReads),
      startRecipeUseCase: new StartRecipeUseCase(recipeReads),
      findRecipeUseCase: new FindRecipeUseCase(recipeReads),
      createRecipeUseCase: new CreateRecipeUseCase({
        ...recipeReads,
        ...writeHandles,
        recipeIdsPort: new RandomRecipeIdsAdapter(),
        photos,
      }),
      editRecipeUseCase: new EditRecipeUseCase({
        ...recipeReads,
        ...writeHandles,
        photos,
      }),
      openRecipePhotoUseCase: new OpenRecipePhotoUseCase({
        recipeLibraryPort: postgresRecipeLibraryRepository,
        recipePhotoStorePort: handles.recipePhotoStorePort,
      }),
    }),
  };
}

export function composeRecipePhotoFiles(
  config: RecipePhotosConfig,
): RecipePhotoFiles {
  return {
    recipePhotoRenditionsPort: createRecipePhotoRenditionsAdapter(
      RECIPE_PHOTO_RENDITION,
    ),
    recipePhotoStorePort: createRecipePhotoStoreAdapter(
      config.RECIPE_PHOTO_ROOT,
    ),
  };
}
