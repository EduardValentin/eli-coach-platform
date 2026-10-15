type FoodCreationFailedIncident = {
  error: unknown;
};

type FoodEditFailedIncident = {
  foodId: string;
  error: unknown;
};

export interface NutritionLibraryIncidents {
  foodCreationFailed(incident: FoodCreationFailedIncident): void;
  foodEditFailed(incident: FoodEditFailedIncident): void;
}
