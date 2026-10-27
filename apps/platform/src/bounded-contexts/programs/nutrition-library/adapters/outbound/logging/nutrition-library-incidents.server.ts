import type { NutritionLibraryIncidents } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export function createNutritionLibraryIncidents(
  logger: Logger,
): NutritionLibraryIncidents {
  return {
    foodCreationFailed: ({ error }) => {
      logger.error("Food could not be created.", {
        errorCategory: "food_creation_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
    foodEditFailed: ({ error, foodId }) => {
      logger.error("Food edit could not be written.", {
        errorCategory: "food_edit_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        foodId,
      });
    },
    recipeCreationFailed: ({ error }) => {
      logger.error("Recipe could not be created.", {
        errorCategory: "recipe_creation_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
    recipeEditFailed: ({ error, recipeId }) => {
      logger.error("Recipe edit could not be written.", {
        errorCategory: "recipe_edit_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        recipeId,
      });
    },
    recipePhotoCleanupFailed: ({ error, photoId }) => {
      logger.error("Recipe photo file could not be removed.", {
        errorCategory: "recipe_photo_cleanup_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        photoId,
      });
    },
  };
}
