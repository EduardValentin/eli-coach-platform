import type { NutritionLibraryIncidentsPort } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export class NutritionLibraryIncidentsAdapter implements NutritionLibraryIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  foodCreationFailed({
    error,
  }: Parameters<NutritionLibraryIncidentsPort["foodCreationFailed"]>[0]) {
    this.logger.error("Food could not be created.", {
      errorCategory: "food_creation_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }

  foodEditFailed({
    error,
    foodId,
  }: Parameters<NutritionLibraryIncidentsPort["foodEditFailed"]>[0]) {
    this.logger.error("Food edit could not be written.", {
      errorCategory: "food_edit_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      foodId,
    });
  }

  recipeCreationFailed({
    error,
  }: Parameters<NutritionLibraryIncidentsPort["recipeCreationFailed"]>[0]) {
    this.logger.error("Recipe could not be created.", {
      errorCategory: "recipe_creation_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }

  recipeEditFailed({
    error,
    recipeId,
  }: Parameters<NutritionLibraryIncidentsPort["recipeEditFailed"]>[0]) {
    this.logger.error("Recipe edit could not be written.", {
      errorCategory: "recipe_edit_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      recipeId,
    });
  }

  recipePhotoCleanupFailed({
    error,
    photoId,
  }: Parameters<NutritionLibraryIncidentsPort["recipePhotoCleanupFailed"]>[0]) {
    this.logger.error("Recipe photo file could not be removed.", {
      errorCategory: "recipe_photo_cleanup_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      photoId,
    });
  }
}
