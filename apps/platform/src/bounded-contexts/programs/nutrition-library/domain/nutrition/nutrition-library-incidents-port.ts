type FoodCreationFailedIncident = {
  error: unknown;
};

type FoodEditFailedIncident = {
  foodId: string;
  error: unknown;
};

type RecipeCreationFailedIncident = {
  error: unknown;
};

type RecipeEditFailedIncident = {
  recipeId: string;
  error: unknown;
};

type RecipePhotoCleanupFailedIncident = {
  photoId: string;
  error: unknown;
};

export interface NutritionLibraryIncidentsPort {
  foodCreationFailed(incident: FoodCreationFailedIncident): void;
  foodEditFailed(incident: FoodEditFailedIncident): void;
  recipeCreationFailed(incident: RecipeCreationFailedIncident): void;
  recipeEditFailed(incident: RecipeEditFailedIncident): void;
  recipePhotoCleanupFailed(incident: RecipePhotoCleanupFailedIncident): void;
}
