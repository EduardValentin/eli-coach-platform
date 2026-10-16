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

export interface NutritionLibraryIncidents {
  foodCreationFailed(incident: FoodCreationFailedIncident): void;
  foodEditFailed(incident: FoodEditFailedIncident): void;
  recipeCreationFailed(incident: RecipeCreationFailedIncident): void;
  recipeEditFailed(incident: RecipeEditFailedIncident): void;
}
