import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { NutritionLibraryIncidentsAdapter } from "./nutrition-library-incidents-adapter.server";

describe("createNutritionLibraryIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a food that could not be created by the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const nutritionLibraryIncidentsAdapter =
      new NutritionLibraryIncidentsAdapter(new ConsoleLoggerAdapter());
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    nutritionLibraryIncidentsAdapter.foodCreationFailed({ error: cause });

    // assert
    expect(consoleError).toHaveBeenCalledWith("Food could not be created.", {
      errorCategory: "food_creation_failure",
      errorClass: "Error",
      errorCode: "ECONNREFUSED",
    });
  });

  it("logs a food edit that could not be written by its id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const nutritionLibraryIncidentsAdapter =
      new NutritionLibraryIncidentsAdapter(new ConsoleLoggerAdapter());
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    nutritionLibraryIncidentsAdapter.foodEditFailed({
      foodId: "food-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Food edit could not be written.",
      {
        errorCategory: "food_edit_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        foodId: "food-1",
      },
    );
  });

  it("logs a recipe that could not be created by the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const nutritionLibraryIncidentsAdapter =
      new NutritionLibraryIncidentsAdapter(new ConsoleLoggerAdapter());
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    nutritionLibraryIncidentsAdapter.recipeCreationFailed({ error: cause });

    // assert
    expect(consoleError).toHaveBeenCalledWith("Recipe could not be created.", {
      errorCategory: "recipe_creation_failure",
      errorClass: "Error",
      errorCode: "ECONNREFUSED",
    });
  });

  it("logs a recipe photo file it could not remove by its photo id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const nutritionLibraryIncidentsAdapter =
      new NutritionLibraryIncidentsAdapter(new ConsoleLoggerAdapter());
    const cause = Object.assign(new Error("/srv/recipe-photos/photos/x"), {
      code: "EACCES",
    });

    // act
    nutritionLibraryIncidentsAdapter.recipePhotoCleanupFailed({
      photoId: "photo-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Recipe photo file could not be removed.",
      {
        errorCategory: "recipe_photo_cleanup_failure",
        errorClass: "Error",
        errorCode: "EACCES",
        photoId: "photo-1",
      },
    );
  });

  it("logs a recipe edit that could not be written by its id and the class and code of its cause only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const nutritionLibraryIncidentsAdapter =
      new NutritionLibraryIncidentsAdapter(new ConsoleLoggerAdapter());
    const cause = Object.assign(new Error("secret row contents"), {
      code: "ECONNREFUSED",
    });

    // act
    nutritionLibraryIncidentsAdapter.recipeEditFailed({
      recipeId: "recipe-1",
      error: cause,
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Recipe edit could not be written.",
      {
        errorCategory: "recipe_edit_failure",
        errorClass: "Error",
        errorCode: "ECONNREFUSED",
        recipeId: "recipe-1",
      },
    );
  });
});
