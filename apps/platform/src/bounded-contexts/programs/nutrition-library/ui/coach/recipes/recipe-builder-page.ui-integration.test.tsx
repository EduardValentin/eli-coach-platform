// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "~/shared/design-system/toast";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, redirect, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { clientAction as editRecipe } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/recipes/recipe";
import { clientAction as createRecipe } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/recipes/recipes";
import type {
  FoodView,
  NutritionTagView,
} from "~/bounded-contexts/programs/nutrition-library/public/foods";
import {
  COACH_NUTRITION_PATH,
  COACH_RECIPES_PATH,
  NEW_RECIPE_PATH,
  NUTRITION_LIBRARY_API_PATHS,
  RECIPE_EDITOR_ROUTE_SEGMENT,
  recipeBuilderPath,
  recipePhotoPath,
} from "~/bounded-contexts/programs/nutrition-library/public/paths";
import type {
  RecipeBuilderView,
  RecipeCardView,
} from "~/bounded-contexts/programs/nutrition-library/public/recipes";
import NutritionRoute from "~/bounded-contexts/programs/nutrition-library/ui/coach/nutrition/nutrition-page";
import { frameworkModeAction } from "~/composition-root/test-support/framework-mode-action";

import RecipeBuilderRoute from "./recipe-builder-page";

const TAGS: NutritionTagView[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast" },
  { id: "mt-lunch", family: "meal-time", label: "Lunch" },
  { id: "cp-luteal", family: "cycle-phase", label: "Luteal" },
  { id: "nu-omega3", family: "nutrient", label: "Omega-3" },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian" },
  { id: "di-lactose-free", family: "dietary", label: "Lactose-free" },
];

const OATS: FoodView = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
};

const MILK: FoodView = {
  id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
  name: "Milk",
  category: "protein",
  icon: "dairy",
  kcal: 42,
  protein: 3.4,
  carb: 5,
  fat: 1,
  defaultPortionGrams: 250,
  tagIds: [],
};

const HONEY: FoodView = {
  id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
  name: "Honey",
  category: "extra",
  icon: "other",
  kcal: 304,
  protein: 0.3,
  carb: 82.4,
  fat: 0,
  defaultPortionGrams: 10,
  tagIds: [],
};

const PORRIDGE_ID = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a";
const UNKNOWN_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const OTHER_NAMES = ["Omelette", "Salmon bowl"];
const SAVE_FAILED = "We couldn't save the recipe. Try again in a moment.";
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";
const PHOTO_ID = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
const MEGABYTE = 1024 * 1024;
const GRAMS_PROBLEM = "Enter whole grams from 1 to 99,999";
const MINUTES_PROBLEM = "Enter whole minutes up to 9,999";

const NEW_RECIPE: RecipeBuilderView = {
  recipe: null,
  offeredFoods: [HONEY, MILK, OATS],
  placedFoods: [],
  otherNames: OTHER_NAMES,
  tags: TAGS,
};

const PORRIDGE: RecipeBuilderView = {
  recipe: {
    id: PORRIDGE_ID,
    name: "Porridge",
    ingredients: [
      { foodId: OATS.id, grams: 40, method: "boiled" },
      { foodId: MILK.id, grams: 250, method: "raw" },
    ],
    prepMinutes: 5,
    cookMinutes: 10,
    instructions: "Simmer the oats in the milk.",
    icon: "pot",
    mealRoleIds: ["mt-breakfast"],
    tagIds: ["di-vegetarian"],
    photo: null,
  },
  offeredFoods: [HONEY, MILK],
  placedFoods: [OATS],
  otherNames: OTHER_NAMES,
  tags: TAGS,
};

const PORRIDGE_WITH_PHOTO: RecipeBuilderView = {
  ...PORRIDGE,
  recipe: PORRIDGE.recipe && {
    ...PORRIDGE.recipe,
    photo: { path: recipePhotoPath(PORRIDGE_ID, PHOTO_ID) },
  },
};

const PORRIDGE_CARD: RecipeCardView = {
  id: PORRIDGE_ID,
  name: "Porridge",
  icon: "pot",
  photo: null,
  totalMinutes: 15,
  macros: { kcal: 261, protein: 15, carb: 39, fat: 5 },
  tagIds: ["mt-breakfast", "di-vegetarian"],
};

const server = setupServer();

let sentBodies: { method: string; path: string; body: unknown }[] = [];

let savedRecipe: RecipeBuilderView = PORRIDGE;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

function arrangePhoneViewport() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    matches: false,
    media: query,
    removeEventListener: () => {},
  }));
}

function arrangeDesktopViewport() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    matches: true,
    media: query,
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  sentBodies = [];
  savedRecipe = PORRIDGE;
  arrangePhoneViewport();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("a new recipe", () => {
  it("opens blank with nothing flagged, no ingredient, zero macros and Save recipe unavailable", async () => {
    // arrange, act
    await renderBuilder(NEW_RECIPE_PATH);

    // assert
    expect(screen.getByRole("main", { name: "Recipe builder" })).toBeVisible();
    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("textbox", { name: "Recipe name" }),
    );
    expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
      "",
    );
    expect(
      screen.getByRole("textbox", { name: "Recipe name" }),
    ).toHaveAttribute("placeholder", "Recipe name…");
    expect(
      screen.getByText(
        "Drag foods here (or use the + on a food) to add ingredients.",
      ),
    ).toBeInTheDocument();
    expect(macroTiles()).toEqual([
      ["kcal", "0"],
      ["P", "0g"],
      ["C", "0g"],
      ["F", "0g"],
    ]);
    expect(screen.getByRole("spinbutton", { name: "Prep (min)" })).toHaveValue(
      0,
    );
    expect(screen.getByRole("spinbutton", { name: "Cook (min)" })).toHaveValue(
      0,
    );
    expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue(
      "",
    );
    for (const tag of TAGS) {
      expect(
        screen.getByRole("checkbox", { name: tag.label }),
      ).not.toBeChecked();
    }
    expect(screen.getByRole("button", { name: "Choose icon" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Recipe" })).toBeVisible();
    expect(screen.queryByText("Give the recipe a name")).toBeNull();
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
  });

  it("offers every food of her library in the food library, searchable by name", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    const offered = libraryFoods();
    await user.type(
      screen.getByRole("searchbox", { name: "Search foods" }),
      " MIL ",
    );

    // assert
    expect(offered).toEqual(["Honey", "Milk", "Oats"]);
    expect(libraryFoods()).toEqual(["Milk"]);
  });

  it("groups the meal roles and tags under their four families", async () => {
    // arrange, act
    await renderBuilder(NEW_RECIPE_PATH);

    // assert
    const families = within(
      screen.getByRole("group", { name: "Meal role & tags" }),
    ).getAllByRole("group");
    expect(
      families.map((family) => [
        family.getAttribute("aria-label"),
        within(family)
          .getAllByRole("checkbox")
          .map((tag) => tag.getAttribute("aria-label")),
      ]),
    ).toEqual([
      ["Meal-time", ["Breakfast", "Lunch"]],
      ["Cycle phase", ["Luteal"]],
      ["Nutrient / benefit", ["Omega-3"]],
      ["Dietary", ["Vegetarian", "Lactose-free"]],
    ]);
  });

  it("adds a food with its default portion, raw, from its + button, and recalculates the macros", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );

    // assert
    expect(ingredientRows()).toEqual([["Oats", 40, "Raw"]]);
    expect(macroTiles()).toEqual([
      ["kcal", "156"],
      ["P", "7g"],
      ["C", "27g"],
      ["F", "3g"],
    ]);
    expect(
      screen.queryByText(
        "Drag foods here (or use the + on a food) to add ingredients.",
      ),
    ).toBeNull();
  });

  it("adds the same food twice as two ingredients in the order added", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add Milk to recipe" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );

    // assert
    expect(ingredientRows()).toEqual([
      ["Oats", 40, "Raw"],
      ["Milk", 250, "Raw"],
      ["Oats", 40, "Raw"],
    ]);
    expect(macroTiles()).toEqual([
      ["kcal", "416"],
      ["P", "22g"],
      ["C", "66g"],
      ["F", "8g"],
    ]);
  });

  it("moves the macros as she changes grams and a method, and removes an ingredient", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add Milk to recipe" }),
    );

    // act
    await enterAmount(user, "Grams of Milk", "100");
    await choose(user, "Cooking method for Oats", "Boiled");

    // assert
    expect(ingredientRows()).toEqual([
      ["Oats", 40, "Boiled"],
      ["Milk", 100, "Raw"],
    ]);
    expect(macroTiles()).toEqual([
      ["kcal", "198"],
      ["P", "10g"],
      ["C", "32g"],
      ["F", "4g"],
    ]);

    // act
    await user.click(screen.getByRole("button", { name: "Remove Oats" }));

    // assert
    expect(ingredientRows()).toEqual([["Milk", 100, "Raw"]]);
    expect(macroTiles()).toEqual([
      ["kcal", "42"],
      ["P", "3g"],
      ["C", "5g"],
      ["F", "1g"],
    ]);
  });

  it("shows a problem under its field once she starts building", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    await user.click(screen.getByRole("checkbox", { name: "Lunch" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Recipe name" });
    expect(name).toHaveAccessibleDescription("Give the recipe a name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
  });

  it.each([
    {
      entered: "  OMELETTE ",
      problem: "A recipe with this name already exists",
    },
    { entered: "n".repeat(81), problem: "Keep the name to 80 characters" },
  ])(
    "refuses the name $entered with “$problem”",
    async ({ entered, problem }) => {
      // arrange
      const user = await renderBuilder(NEW_RECIPE_PATH);

      // act
      await enterName(user, entered);

      // assert
      expect(
        screen.getByRole("textbox", { name: "Recipe name" }),
      ).toHaveAccessibleDescription(problem);
      expect(
        screen.getByRole("button", { name: "Save recipe" }),
      ).toBeDisabled();
    },
  );

  it.each(["0", "", "1.5", "100000"])(
    "refuses %j grams under that ingredient, keeping what she typed",
    async (entered) => {
      // arrange
      const user = await renderBuilder(NEW_RECIPE_PATH);
      await enterName(user, "Porridge");
      await user.click(
        screen.getByRole("button", { name: "Add Oats to recipe" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Add Milk to recipe" }),
      );

      // act
      await enterAmount(user, "Grams of Milk", entered);

      // assert
      const grams = screen.getByRole("spinbutton", { name: "Grams of Milk" });
      expect(grams).toHaveAccessibleDescription(GRAMS_PROBLEM);
      expect(grams).toHaveAttribute("aria-invalid", "true");
      expect(grams).toHaveValue(entered === "" ? null : Number(entered));
      expect(
        screen.getByRole("spinbutton", { name: "Grams of Oats" }),
      ).not.toHaveAttribute("aria-invalid");
      expect(
        screen.getByRole("button", { name: "Save recipe" }),
      ).toBeDisabled();
    },
  );

  it.each([
    { field: "Prep (min)", entered: "10000", problem: MINUTES_PROBLEM },
    { field: "Cook (min)", entered: "2.5", problem: MINUTES_PROBLEM },
  ])(
    "refuses $entered in $field with “$problem”",
    async ({ field, entered, problem }) => {
      // arrange
      const user = await renderBuilder(NEW_RECIPE_PATH);
      await enterName(user, "Porridge");

      // act
      await enterAmount(user, field, entered);

      // assert
      expect(
        screen.getByRole("spinbutton", { name: field }),
      ).toHaveAccessibleDescription(problem);
      expect(
        screen.getByRole("button", { name: "Save recipe" }),
      ).toBeDisabled();
    },
  );

  it("refuses instructions of 2,001 characters", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");

    // act
    await user.click(screen.getByRole("textbox", { name: "Instructions" }));
    await user.paste("i".repeat(2_001));

    // assert
    expect(
      screen.getByRole("textbox", { name: "Instructions" }),
    ).toHaveAccessibleDescription("Keep the instructions to 2,000 characters");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();
  });

  it("accepts the highest grams and minutes, blank minutes and the longest instructions", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );

    // act
    await enterAmount(user, "Grams of Oats", "99999");
    await enterAmount(user, "Prep (min)", "9999");
    await enterAmount(user, "Cook (min)", "");
    await user.click(screen.getByRole("textbox", { name: "Instructions" }));
    await user.paste("i".repeat(2_000));

    // assert
    expect(screen.queryByText(GRAMS_PROBLEM)).toBeNull();
    expect(screen.queryByText(MINUTES_PROBLEM)).toBeNull();
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  });

  it("chooses a meal icon from the popover and clears it with None", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    await user.click(screen.getByRole("button", { name: "Choose icon" }));
    await user.click(
      within(
        await screen.findByRole("listbox", { name: "Meal icon" }),
      ).getByRole("option", { name: "Stew" }),
    );

    // assert
    const trigger = screen.getByRole("button", { name: "Icon: Stew" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("listbox", { name: "Meal icon" })).toBeNull();

    // act
    await user.click(trigger);
    const icons = await screen.findByRole("listbox", { name: "Meal icon" });
    const options = within(icons).getAllByRole("option");
    await user.click(within(icons).getByRole("option", { name: "None" }));

    // assert
    expect(options).toHaveLength(18);
    expect(options[0]).toHaveAccessibleName("None");
    expect(screen.getByRole("button", { name: "Choose icon" })).toBeVisible();
  });

  it("saves a recipe with no ingredients", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Water");

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: NUTRITION_LIBRARY_API_PATHS.recipes,
        body: {
          name: "Water",
          ingredients: [],
          prepMinutes: 0,
          cookMinutes: 0,
          instructions: "",
          icon: null,
          tagIds: [],
          photo: "keep",
        },
      },
    ]);
  });

  it("creates the whole recipe and returns to the Recipes tab with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "  Porridge ");
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Add Milk to recipe" }),
    );
    await choose(user, "Cooking method for Oats", "Boiled");
    await enterAmount(user, "Prep (min)", "5");
    await enterAmount(user, "Cook (min)", "");
    await user.click(screen.getByRole("textbox", { name: "Instructions" }));
    await user.paste("Simmer the oats in the milk.");
    await user.click(screen.getByRole("checkbox", { name: "Vegetarian" }));
    await user.click(screen.getByRole("checkbox", { name: "Breakfast" }));
    await user.click(screen.getByRole("button", { name: "Choose icon" }));
    await user.click(await screen.findByRole("option", { name: "Stew" }));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
    expect(
      await screen.findByRole("tab", { name: "Recipes", selected: true }),
    ).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: NUTRITION_LIBRARY_API_PATHS.recipes,
        body: {
          name: "  Porridge ",
          ingredients: [
            { foodId: OATS.id, grams: 40, method: "boiled" },
            { foodId: MILK.id, grams: 250, method: "raw" },
          ],
          prepMinutes: 5,
          cookMinutes: 0,
          instructions: "Simmer the oats in the milk.",
          icon: "pot",
          tagIds: ["di-vegetarian", "mt-breakfast"],
          photo: "keep",
        },
      },
    ]);
  });

  it("shows a name taken while she was building on the name field, focused, and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, () =>
        HttpResponse.json({ problems: { name: "taken" } }, { status: 422 }),
      ),
    );
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.click(
      screen.getByRole("button", { name: "Add Oats to recipe" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Lunch" }));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    const name = screen.getByRole("textbox", { name: "Recipe name" });
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(
        "A recipe with this name already exists",
      ),
    );
    expect(name).toHaveFocus();
    expect(name).toHaveValue("Porridge");
    expect(ingredientRows()).toEqual([["Oats", 40, "Raw"]]);
    expect(screen.getByRole("checkbox", { name: "Lunch" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeDisabled();

    // act
    await enterName(user, "Oat porridge");

    // assert
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  });

  it("words a save the server could not make as a failure and keeps her entries", async () => {
    // arrange
    server.use(
      http.post(
        `*${NUTRITION_LIBRARY_API_PATHS.recipes}`,
        () => new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
      "Porridge",
    );
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  });

  it("opens the food library drawer and closes it again, keeping her place", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);

    // act
    await user.click(screen.getByRole("button", { name: "Open food library" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Close food library" }),
    ).toHaveFocus();
    expect(
      within(
        screen.getByRole("complementary", { name: "Food library" }),
      ).getByRole("searchbox", { name: "Search foods" }),
    ).toBeVisible();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(
      screen.getByRole("button", { name: "Open food library" }),
    ).toHaveFocus();
  });
});

describe("the recipe photo", () => {
  it("previews a chosen photo named for the recipe with Replace and Remove over it in place of Upload photo, and moves her to Replace", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    expect(uploadButton()).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Replace recipe photo" }),
    ).toBeNull();

    // act
    await user.click(uploadButton());
    choosePhoto(photoNamed("bowl.jpg"));

    // assert
    expect(preview("Porridge")).toHaveAttribute("src", "blob:bowl.jpg");
    expect(replaceButton()).toHaveFocus();
    expect(removeButton()).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Upload recipe photo" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Choose icon" })).toBeVisible();
  });

  it("lets go of the preview of a photo she replaces", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await user.upload(photoInput(), photoNamed("first.jpg"));

    // act
    await user.upload(photoInput(), photoNamed("second.png", 5, "image/png"));

    // assert
    expect(preview("Recipe")).toHaveAttribute("src", "blob:second.png");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.jpg");
  });

  it.each([
    {
      refused: "a file that is not a JPEG, PNG or WebP photo",
      file: () => photoNamed("bowl.gif", 5, "image/gif"),
      message:
        "bowl.gif is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported",
    },
    {
      refused: "a photo over 10 MB",
      file: () => photoNamed("bowl.png", 10 * MEGABYTE + 1, "image/png"),
      message: "bowl.png is larger than 10 MB",
    },
  ])(
    "refuses $refused on the spot, naming it, and keeps what was there",
    async ({ file, message }) => {
      // arrange
      await renderBuilder(NEW_RECIPE_PATH);

      // act
      choosePhoto(file());

      // assert
      expect(
        (await screen.findByText(message)).closest("[role=alert]"),
      ).toBeInTheDocument();
      expect(uploadButton()).toHaveAttribute("aria-invalid", "true");
      expect(uploadButton()).toHaveAccessibleDescription(message);
      expect(
        screen.queryByRole("button", { name: "Replace recipe photo" }),
      ).toBeNull();

      // act
      choosePhoto(photoNamed("bowl.jpg"));
      choosePhoto(file());

      // assert
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(preview("Recipe")).toHaveAttribute("src", "blob:bowl.jpg");
      expect(replaceButton()).toHaveAttribute("aria-invalid", "true");
      expect(replaceButton()).toHaveAccessibleDescription(message);

      // act
      choosePhoto(photoNamed("bowl.webp", 5, "image/webp"));

      // assert
      expect(screen.queryByText(message)).toBeNull();
      expect(replaceButton()).not.toHaveAttribute("aria-invalid");
    },
  );

  it("sends the recipe and the chosen photo in one save and returns to the Recipes tab", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "POST",
        path: NUTRITION_LIBRARY_API_PATHS.recipes,
        body: {
          recipe: {
            name: "Porridge",
            ingredients: [],
            prepMinutes: 0,
            cookMinutes: 0,
            instructions: "",
            icon: null,
            tagIds: [],
            photo: "attach",
          },
          photoFilename: "blob",
        },
      },
    ]);
  });

  it("reads Saving… and locks Save, Replace and Remove while the photo uploads", async () => {
    // arrange
    const release = holdSaves();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    const saving = await screen.findByRole("button", { name: "Saving…" });
    expect(saving).toBeDisabled();
    expect(saving).toHaveAttribute("aria-busy", "true");
    expect(saving).toHaveTextContent("Saving…");
    expect(replaceButton()).toBeDisabled();
    expect(removeButton()).toBeDisabled();

    // act
    release();

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
  });

  it.each([
    {
      httpStatus: 422,
      problem: "unsupported",
      message: "bowl.jpg doesn’t contain a JPEG, PNG or WebP photo.",
    },
    {
      httpStatus: 413,
      problem: "too-large",
      message: "bowl.jpg is larger than 10 MB",
    },
  ])(
    "shows the server refusing the photo as $problem under the visual, naming it, moves her to Replace and keeps every entry",
    async ({ httpStatus, problem, message }) => {
      // arrange
      server.use(
        http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, () =>
          HttpResponse.json(
            { problems: { photo: problem } },
            { status: httpStatus },
          ),
        ),
      );
      const user = await renderBuilder(NEW_RECIPE_PATH);
      await enterName(user, "Porridge");
      await user.click(
        screen.getByRole("button", { name: "Add Oats to recipe" }),
      );
      await user.upload(photoInput(), photoNamed("bowl.jpg"));

      // act
      await user.click(screen.getByRole("button", { name: "Save recipe" }));

      // assert
      expect(
        (await screen.findByText(message)).closest("[role=alert]"),
      ).toBeInTheDocument();
      expect(replaceButton()).toHaveAttribute("aria-invalid", "true");
      expect(replaceButton()).toHaveAccessibleDescription(message);
      expect(replaceButton()).toHaveFocus();
      expect(preview("Porridge")).toHaveAttribute("src", "blob:bowl.jpg");
      expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
        "Porridge",
      );
      expect(ingredientRows()).toEqual([["Oats", 40, "Raw"]]);
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
      expect(screen.queryByText(SAVE_FAILED)).toBeNull();
      expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
    },
  );

  it("keeps every entry and the photo when the upload does not go through, and Try again sends it again", async () => {
    // arrange
    let attempts = 0;
    server.use(
      http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, () => {
        attempts += 1;

        return attempts === 1
          ? HttpResponse.error()
          : HttpResponse.json({ redirectTo: COACH_RECIPES_PATH });
      }),
    );
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    const failure = await screen.findByText(UPLOAD_FAILED);
    expect(failure.closest("[role=alert]")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
      "Porridge",
    );
    expect(preview("Porridge")).toHaveAttribute("src", "blob:bowl.jpg");
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("drops the failure alert once she chooses another photo", async () => {
    // arrange
    server.use(
      http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, () =>
        HttpResponse.error(),
      ),
    );
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    await screen.findByText(UPLOAD_FAILED);

    // act
    await user.upload(photoInput(), photoNamed("other.jpg"));

    // assert
    expect(screen.queryByText(UPLOAD_FAILED)).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("shows the generic failure, not the upload alert, when the server refuses a field the page cannot show while a photo is chosen", async () => {
    // arrange
    server.use(
      http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, () =>
        HttpResponse.json({ problems: { icon: "unknown" } }, { status: 422 }),
      ),
    );
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText(SAVE_FAILED)).toBeInTheDocument();
    expect(screen.queryByText(UPLOAD_FAILED)).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("returns her to Upload photo when she removes a photo she just chose, and saves the recipe without one", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await enterName(user, "Porridge");
    await user.upload(photoInput(), photoNamed("bowl.jpg"));

    // act
    await user.click(removeButton());

    // assert
    expect(uploadButton()).toHaveFocus();
    expect(preview("Porridge").tagName).not.toBe("IMG");
    expect(
      screen.queryByRole("button", { name: "Remove recipe photo" }),
    ).toBeNull();

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe created")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({ name: "Porridge", photo: "keep" }),
      }),
    ]);
  });
});

describe("editing a recipe with a photo", () => {
  beforeEach(() => {
    savedRecipe = PORRIDGE_WITH_PHOTO;
  });

  it("shows the stored photo and keeps it when she saves without touching it", async () => {
    // arrange
    acceptSaves();

    // act
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // assert
    expect(preview("Porridge")).toHaveAttribute(
      "src",
      recipePhotoPath(PORRIDGE_ID, PHOTO_ID),
    );
    expect(replaceButton()).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Upload recipe photo" }),
    ).toBeNull();

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${NUTRITION_LIBRARY_API_PATHS.recipes}/${PORRIDGE_ID}`,
        body: expect.objectContaining({ name: "Porridge", photo: "keep" }),
      },
    ]);
  });

  it("leaves the recipe with its icon when she removes the stored photo and saves", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // act
    await user.click(removeButton());

    // assert
    expect(uploadButton()).toHaveFocus();
    expect(preview("Porridge").tagName).not.toBe("IMG");

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${NUTRITION_LIBRARY_API_PATHS.recipes}/${PORRIDGE_ID}`,
        body: expect.objectContaining({ name: "Porridge", photo: "remove" }),
      },
    ]);
  });

  it("sends the new photo in place of the stored one when she replaces it and saves", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // act
    await user.upload(photoInput(), photoNamed("bowl.webp", 5, "image/webp"));

    // assert
    expect(preview("Porridge")).toHaveAttribute("src", "blob:bowl.webp");

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe updated")).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${NUTRITION_LIBRARY_API_PATHS.recipes}/${PORRIDGE_ID}`,
        body: {
          recipe: expect.objectContaining({
            name: "Porridge",
            photo: "attach",
          }),
          photoFilename: "blob",
        },
      },
    ]);
  });
});

describe("the food library drawer on a phone", () => {
  const library = () =>
    screen.getByRole("complementary", { name: "Food library" });
  const libraryControls = () => within(library()).getAllByRole("button");

  async function openLibrary(user: UserEvent) {
    await user.click(screen.getByRole("button", { name: "Open food library" }));
  }

  it("closes on Escape and returns focus to Open food library", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await openLibrary(user);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(
      screen.getByRole("button", { name: "Open food library" }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveFocus();
  });

  it("wraps Tab from its last control to its first", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await openLibrary(user);
    libraryControls().at(-1)?.focus();

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole("button", { name: "Close food library" }),
    ).toHaveFocus();
  });

  it("wraps Shift+Tab from its first control to its last", async () => {
    // arrange
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await openLibrary(user);

    // act
    await user.tab({ shift: true });

    // assert
    expect(libraryControls().at(-1)).toHaveFocus();
  });

  it("leaves Tab and Escape alone on a wide screen, where the library sits beside the recipe", async () => {
    // arrange
    arrangeDesktopViewport();
    const user = await renderBuilder(NEW_RECIPE_PATH);
    await openLibrary(user);

    // act
    await user.keyboard("{Escape}");
    await user.tab({ shift: true });

    // assert
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveFocus();
  });
});

describe("editing a recipe", () => {
  it("opens with the recipe's saved entries and their macros", async () => {
    // arrange, act
    await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // assert
    expect(screen.getByRole("textbox", { name: "Recipe name" })).toHaveValue(
      "Porridge",
    );
    expect(ingredientRows()).toEqual([
      ["Oats", 40, "Boiled"],
      ["Milk", 250, "Raw"],
    ]);
    expect(macroTiles()).toEqual([
      ["kcal", "261"],
      ["P", "15g"],
      ["C", "39g"],
      ["F", "5g"],
    ]);
    expect(screen.getByRole("spinbutton", { name: "Prep (min)" })).toHaveValue(
      5,
    );
    expect(screen.getByRole("spinbutton", { name: "Cook (min)" })).toHaveValue(
      10,
    );
    expect(screen.getByRole("textbox", { name: "Instructions" })).toHaveValue(
      "Simmer the oats in the milk.",
    );
    expect(screen.getByRole("checkbox", { name: "Breakfast" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Vegetarian" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lunch" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Icon: Stew" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Porridge" })).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled(),
    );
  });

  it("keeps an archived food the recipe uses in its place while offering only her active foods", async () => {
    // arrange
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // act
    await enterAmount(user, "Grams of Oats", "60");

    // assert
    expect(libraryFoods()).toEqual(["Honey", "Milk"]);
    expect(ingredientRows()).toEqual([
      ["Oats", 60, "Boiled"],
      ["Milk", 250, "Raw"],
    ]);
    expect(screen.getByRole("button", { name: "Save recipe" })).toBeEnabled();
  });

  it("keeps its own name free while flagging another recipe's", async () => {
    // arrange
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));

    // act
    await enterName(user, " porridge ");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Recipe name" }),
    ).not.toHaveAttribute("aria-invalid");

    // act
    await enterName(user, "salmon BOWL");

    // assert
    expect(
      screen.getByRole("textbox", { name: "Recipe name" }),
    ).toHaveAccessibleDescription("A recipe with this name already exists");
  });

  it("saves the whole recipe and returns to the Recipes tab with a confirmation", async () => {
    // arrange
    acceptSaves();
    const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));
    await enterAmount(user, "Grams of Milk", "300");
    await user.click(screen.getByRole("button", { name: "Remove Oats" }));
    await user.click(
      screen.getByRole("button", { name: "Add Honey to recipe" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Breakfast" }));
    await user.click(screen.getByRole("checkbox", { name: "Luteal" }));

    // act
    await user.click(screen.getByRole("button", { name: "Save recipe" }));

    // assert
    expect(await screen.findByText("Recipe updated")).toBeInTheDocument();
    expect(
      await screen.findByRole("article", { name: "Porridge" }),
    ).toBeInTheDocument();
    expect(sentBodies).toEqual([
      {
        method: "PUT",
        path: `${NUTRITION_LIBRARY_API_PATHS.recipes}/${PORRIDGE_ID}`,
        body: {
          name: "Porridge",
          ingredients: [
            { foodId: MILK.id, grams: 300, method: "raw" },
            { foodId: HONEY.id, grams: 10, method: "raw" },
          ],
          prepMinutes: 5,
          cookMinutes: 10,
          instructions: "Simmer the oats in the milk.",
          icon: "pot",
          tagIds: ["di-vegetarian", "cp-luteal"],
          photo: "keep",
        },
      },
    ]);
  });

  it("returns to the Recipes tab for a recipe the library does not hold", async () => {
    // arrange, act
    await renderBuilder(recipeBuilderPath(UNKNOWN_ID), "Nutrition");

    // assert
    expect(
      screen.getByRole("tab", { name: "Recipes", selected: true }),
    ).toBeInTheDocument();
  });

  it.each(["Cancel", "Back to Nutrition"])(
    "returns to the Recipes tab through %s without saving",
    async (leave) => {
      // arrange
      const user = await renderBuilder(recipeBuilderPath(PORRIDGE_ID));
      await enterName(user, "Oat porridge");

      // act
      await user.click(screen.getByRole("link", { name: leave }));

      // assert
      expect(
        await screen.findByRole("tab", { name: "Recipes", selected: true }),
      ).toBeInTheDocument();
      expect(sentBodies).toEqual([]);
    },
  );
});

function acceptSaves() {
  const record = async ({ request }: { request: Request }) => {
    sentBodies.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: await sentBodyOf(request),
    });

    return HttpResponse.json({ redirectTo: COACH_RECIPES_PATH });
  };

  server.use(
    http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, record),
    http.put(`*${NUTRITION_LIBRARY_API_PATHS.recipes}/:recipeId`, record),
  );
}

async function sentBodyOf(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return request.json();
  }

  const body = await request.text();

  return {
    recipe: JSON.parse(partOf(body, "recipe")),
    photoFilename: /name="photo"; filename="([^"]*)"/.exec(body)?.[1],
  };
}

function partOf(body: string, name: string): string {
  const match = new RegExp(
    `name="${name}"(?:; filename="[^"]*")?\\r\\n(?:Content-Type: [^\\r]*\\r\\n)?\\r\\n([^\\r]*)`,
  ).exec(body);

  return match?.[1] ?? "";
}

function photoNamed(name: string, size = 5, type = "image/jpeg") {
  const file = new File(["photo"], name, { type });
  Object.defineProperty(file, "size", { value: size });

  return file;
}

function photoInput(): HTMLElement {
  return screen.getByLabelText("Recipe photo file input");
}

function choosePhoto(file: File) {
  fireEvent.change(photoInput(), { target: { files: [file] } });
}

function uploadButton(): HTMLElement {
  return screen.getByRole("button", { name: "Upload recipe photo" });
}

function replaceButton(): HTMLElement {
  return screen.getByRole("button", { name: "Replace recipe photo" });
}

function removeButton(): HTMLElement {
  return screen.getByRole("button", { name: "Remove recipe photo" });
}

function preview(name: string): HTMLElement {
  return screen.getByRole("img", { name });
}

function holdSaves(): () => void {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  server.use(
    http.post(`*${NUTRITION_LIBRARY_API_PATHS.recipes}`, async () => {
      await held;

      return HttpResponse.json({ redirectTo: COACH_RECIPES_PATH });
    }),
  );

  return release;
}

function macroTiles(): string[][] {
  return within(screen.getByRole("region", { name: "Macros" }))
    .getAllByRole("term")
    .map((term) => [
      term.textContent ?? "",
      term.nextElementSibling?.textContent ?? "",
    ]);
}

function libraryFoods(): string[] {
  return within(screen.getByRole("complementary", { name: "Food library" }))
    .getAllByRole("button", { name: /^Add .* to recipe$/ })
    .map(
      (add) =>
        add.getAttribute("aria-label")?.replace(/^Add (.*) to recipe$/, "$1") ??
        "",
    );
}

function ingredientRows(): [string, number | null, string][] {
  return screen
    .queryAllByRole("spinbutton", { name: /^Grams of / })
    .map((grams) => {
      const food =
        grams.getAttribute("aria-label")?.replace(/^Grams of /, "") ?? "";
      const method = screen.getAllByRole("combobox", {
        name: `Cooking method for ${food}`,
      });
      const row = grams.closest("li");
      const methodOfRow = method.find((trigger) => row?.contains(trigger));

      return [
        food,
        (grams as HTMLInputElement).valueAsNumber || null,
        methodOfRow?.textContent ?? "",
      ];
    });
}

async function enterName(user: UserEvent, text: string) {
  const entry = screen.getByRole("textbox", { name: "Recipe name" });
  await user.clear(entry);
  await user.click(entry);
  await user.paste(text);
}

async function enterAmount(user: UserEvent, field: string, amount: string) {
  const entry = screen.getByRole("spinbutton", { name: field });
  await user.clear(entry);
  if (amount !== "") {
    await user.type(entry, amount);
  }
}

async function choose(user: UserEvent, field: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

async function renderBuilder(entry: string, heading?: string) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: NutritionRoute,
        loader: () => ({ foods: [], tags: TAGS, recipes: [PORRIDGE_CARD] }),
        path: COACH_NUTRITION_PATH,
      },
      {
        Component: RecipeBuilderRoute,
        loader: () => NEW_RECIPE,
        path: NEW_RECIPE_PATH,
      },
      {
        Component: RecipeBuilderRoute,
        loader: ({ params }) => {
          if (params.recipeId !== PORRIDGE_ID) {
            throw redirect(COACH_RECIPES_PATH);
          }

          return savedRecipe;
        },
        path: `/coach/${RECIPE_EDITOR_ROUTE_SEGMENT}`,
      },
      {
        action: frameworkModeAction(createRecipe),
        path: NUTRITION_LIBRARY_API_PATHS.recipes,
      },
      {
        action: frameworkModeAction(editRecipe),
        path: NUTRITION_LIBRARY_API_PATHS.recipe,
      },
    ],
    { initialEntries: [entry] },
  );

  render(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
  );
  await screen.findByRole("heading", {
    level: 1,
    name: heading ?? "Recipe builder",
  });

  return user;
}
