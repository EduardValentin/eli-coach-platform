import { expect, test } from "../support/fixtures";
import type { SavedFood } from "../support/food-editor-page";
import type { FoodFields } from "../support/food-requests";
import { NO_MACROS } from "../support/macro-tiles";
import type { RecipeCard } from "../support/nutrition-library-page";
import type { SavedRecipe } from "../support/recipe-builder-page";
import type { RecipeFields } from "../support/recipe-requests";
import {
  setDesktopViewport,
  setPhoneViewport,
  setTabletViewport,
} from "../support/viewport";

const UNKNOWN_FOOD_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_FOOD_ID = "not-a-food";
const UNKNOWN_RECIPE_ID = "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
const NOT_A_RECIPE_ID = "not-a-recipe";

function oatsNamed(name: string): FoodFields {
  return {
    name,
    category: "carb",
    icon: "grain",
    kcal: 389,
    protein: 16.9,
    carb: 66.3,
    fat: 6.9,
    defaultPortionGrams: 40,
    tagIds: ["mt-breakfast"],
  };
}

function yoghurtNamed(name: string): FoodFields {
  return {
    name,
    category: "protein",
    icon: "dairy",
    kcal: 97,
    protein: 9,
    carb: 3.98,
    fat: 5,
    defaultPortionGrams: 150,
    tagIds: [],
  };
}

function saladNamed(name: string): RecipeFields {
  return {
    name,
    ingredients: [],
    prepMinutes: 5,
    cookMinutes: 10,
    instructions: "",
    icon: "salad",
    tagIds: ["mt-lunch", "di-vegetarian"],
  };
}

function saladCardOf(name: string): RecipeCard {
  return {
    name,
    minutes: "15",
    macros: NO_MACROS,
    tags: ["Lunch", "Vegetarian"],
  };
}

test(
  "the coach reaches her food library from the menu, creates a food with its values and tags, finds it listed and edits it",
  { tag: "@critical" },
  async ({
    coachDashboard,
    foodEditor,
    nutritionLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const created: SavedFood = {
      name: `Rolled oats ${scenarioTag}`,
      category: "Carb",
      icon: "Grain",
      kcal: "389",
      protein: "16.9",
      carb: "66.3",
      fat: "6.9",
      defaultPortionGrams: "40",
      tags: ["Breakfast", "Vegetarian"],
    };
    const edited: SavedFood = {
      ...created,
      name: `Jumbo oats ${scenarioTag}`,
      kcal: "375.5",
      defaultPortionGrams: "50",
      tags: ["Vegetarian", "Luteal"],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    await nutritionLibrary.openFromNavigation();

    // assert
    await nutritionLibrary.expectNutritionRightAfterTraining();

    // act
    await nutritionLibrary.startNewFood();

    // assert
    await foodEditor.expectNewFood();

    // act
    await foodEditor.enter({
      name: created.name,
      category: created.category,
      icon: created.icon,
      kcal: created.kcal,
      protein: created.protein,
      carb: created.carb,
      fat: created.fat,
      defaultPortionGrams: created.defaultPortionGrams,
      toggledTags: created.tags,
    });
    await foodEditor.create();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectConfirmation("Food created");
    await nutritionLibrary.expectListed({
      name: created.name,
      category: created.category,
      kcal: created.kcal,
      protein: created.protein,
      carb: created.carb,
      fat: created.fat,
      tags: created.tags,
    });

    // act
    await nutritionLibrary.edit(created.name);

    // assert
    await foodEditor.expectEditing(created);

    // act
    await foodEditor.enter({
      name: edited.name,
      kcal: edited.kcal,
      defaultPortionGrams: edited.defaultPortionGrams,
      toggledTags: ["Breakfast", "Luteal"],
    });
    await foodEditor.saveChanges();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectConfirmation("Food updated");
    await nutritionLibrary.expectListed({
      name: edited.name,
      category: edited.category,
      kcal: edited.kcal,
      protein: edited.protein,
      carb: edited.carb,
      fat: edited.fat,
      tags: ["Luteal", "Vegetarian"],
    });
    await nutritionLibrary.expectNotListed(created.name);

    // act
    await nutritionLibrary.edit(edited.name);

    // assert
    await foodEditor.expectEditing(edited);
  },
);

test(
  "the editor shows each problem under its field, announced with the field, and creates nothing until they clear",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    foodRequests,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const takenName = `Oats ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(takenName));

    // act
    await foodEditor.openNew();

    // assert
    await foodEditor.expectNewFood();

    // act
    await foodEditor.enter({ name: `Quinoa ${scenarioTag}` });

    // assert
    await foodEditor.expectNoProblems();
    await foodEditor.expectCreateAvailable();

    // act
    await foodEditor.enter({ name: "   " });

    // assert
    await foodEditor.expectOnlyProblem("Name", "Give the food a name");

    // act
    await foodEditor.enter({ name: "n".repeat(81) });

    // assert
    await foodEditor.expectOnlyProblem(
      "Name",
      "Keep the name to 80 characters",
    );

    // act
    await foodEditor.enter({ name: `  ${"n".repeat(80)}  ` });

    // assert
    await foodEditor.expectNoProblems();

    // act
    await foodEditor.enter({ name: `  ${takenName.toUpperCase()} ` });

    // assert
    await foodEditor.expectOnlyProblem(
      "Name",
      "A food with this name already exists",
    );

    // act
    await foodEditor.enter({ name: `Quinoa ${scenarioTag}`, kcal: "10000" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Calories",
      "Enter a value from 0 to 9,999.99",
    );

    // act
    await foodEditor.enter({ kcal: "9999.99", fat: "1.234" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Fat (g)",
      "Enter a value from 0 to 9,999.99",
    );

    // act
    await foodEditor.enter({ fat: "", protein: "-0.5" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Protein (g)",
      "Enter a value from 0 to 9,999.99",
    );

    // act
    await foodEditor.enter({ protein: "0", carb: "10000.5" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Carbs (g)",
      "Enter a value from 0 to 9,999.99",
    );

    // act
    await foodEditor.enter({ carb: "9999.99", defaultPortionGrams: "40.5" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Default portion (g)",
      "Enter whole grams up to 99,999",
    );

    // act
    await foodEditor.enter({ defaultPortionGrams: "100000" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Default portion (g)",
      "Enter whole grams up to 99,999",
    );

    // act
    await foodEditor.enter({ defaultPortionGrams: "99999" });

    // assert
    await foodEditor.expectNoProblems();
    await foodEditor.expectCreateAvailable();
  },
);

test(
  "a name taken while the editor is open is shown on the name field and her entries stay",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const entered: SavedFood = {
      name: `Greek yoghurt ${scenarioTag}`,
      category: "Protein",
      icon: "Dairy",
      kcal: "97",
      protein: "9",
      carb: "3.98",
      fat: "5",
      defaultPortionGrams: "150",
      tags: ["Breakfast", "Snack"],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodEditor.openNew();
    await foodEditor.enter({
      name: entered.name,
      icon: entered.icon,
      kcal: entered.kcal,
      protein: entered.protein,
      carb: entered.carb,
      fat: entered.fat,
      defaultPortionGrams: entered.defaultPortionGrams,
      toggledTags: entered.tags,
    });
    await foodRequests.createAccepted(
      oatsNamed(` ${entered.name.toLowerCase()}`),
    );

    // act
    await foodEditor.create();

    // assert
    await foodEditor.expectOnlyProblem(
      "Name",
      "A food with this name already exists",
    );
    await foodEditor.expectFocusOn("Name");
    await foodEditor.expectStillNew();
    await foodEditor.expectEntries(entered);

    // act
    await foodEditor.enter({ name: `${entered.name} (full fat)` });
    await foodEditor.create();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectConfirmation("Food created");
    await nutritionLibrary.expectListed({
      name: `${entered.name} (full fat)`,
      category: entered.category,
      kcal: entered.kcal,
      protein: entered.protein,
      carb: entered.carb,
      fat: entered.fat,
      tags: entered.tags,
    });
  },
);

test(
  "the editor offers six categories, 28 named icons and 16 tags in four families",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    await foodEditor.openNew();

    // assert
    await foodEditor.expectChoices();
  },
);

test(
  "calories and macros keep their decimals, a blank macro is saved as 0 and a blank or zero portion as 100",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    nutritionLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const saved: SavedFood = {
      name: `Apple ${scenarioTag}`,
      category: "Extra",
      icon: "Fruit",
      kcal: "52.25",
      protein: "0",
      carb: "13.81",
      fat: "0",
      defaultPortionGrams: "100",
      tags: [],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodEditor.openNew();

    // act
    await foodEditor.enter({
      name: saved.name,
      category: saved.category,
      icon: saved.icon,
      kcal: saved.kcal,
      carb: saved.carb,
      defaultPortionGrams: "",
    });
    await foodEditor.create();

    // assert
    await nutritionLibrary.expectConfirmation("Food created");
    await nutritionLibrary.expectListed({
      name: saved.name,
      category: saved.category,
      kcal: saved.kcal,
      protein: saved.protein,
      carb: saved.carb,
      fat: saved.fat,
      tags: saved.tags,
    });

    // act
    await nutritionLibrary.edit(saved.name);

    // assert
    await foodEditor.expectEditing(saved);

    // act
    await foodEditor.enter({ defaultPortionGrams: "0", protein: "0.3" });
    await foodEditor.saveChanges();

    // assert
    await nutritionLibrary.expectConfirmation("Food updated");

    // act
    await nutritionLibrary.edit(saved.name);

    // assert
    await foodEditor.expectEditing({ ...saved, protein: "0.3" });
  },
);

test(
  "a coach with no foods sees that her library is empty",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    await nutritionLibrary.open();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectEmpty();
  },
);

test(
  "the coach creates a food by keyboard alone and finds it listed A to Z",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const last = `Cottage cheese ${scenarioTag}`;
    const middle = `Brown rice ${scenarioTag}`;
    const created: SavedFood = {
      name: `almonds ${scenarioTag}`,
      category: "Fat",
      icon: "Nut / seed",
      kcal: "579",
      protein: "21.15",
      carb: "21.55",
      fat: "49.93",
      defaultPortionGrams: "30",
      tags: ["Snack", "Magnesium"],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(last));
    await foodRequests.createAccepted(oatsNamed(middle));
    await nutritionLibrary.open();

    // act
    await nutritionLibrary.startNewFoodWithKeyboard();

    // assert
    await foodEditor.expectNewFood();

    // act
    await foodEditor.createWithKeyboard(created);

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectConfirmation("Food created");
    await nutritionLibrary.expectListed({
      name: created.name,
      category: created.category,
      kcal: created.kcal,
      protein: created.protein,
      carb: created.carb,
      fat: created.fat,
      tags: created.tags,
    });
    await nutritionLibrary.expectListedInOrder([created.name, middle, last]);
  },
);

test(
  "Nutrition sits right after Training in the coach's phone menu and opens the library",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await setPhoneViewport(page);

    // act
    await nutritionLibrary.openPhoneMenu();

    // assert
    await nutritionLibrary.expectPhoneMenuNutritionRightAfterTraining();

    // act
    await nutritionLibrary.openFromPhoneMenu();

    // assert
    await nutritionLibrary.expectOpen();
  },
);

test(
  "an unknown food or another coach's food returns the coach to the library",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    foodRequests,
    nutritionLibrary,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    // arrange
    const othersFood = oatsNamed(`Spelt ${scenarioTag}`);
    await provisionAccount("COACH");
    await provisionCoach();
    await page.goto("/store");
    await signIn();
    await foodRequests.createAccepted(othersFood);
    await nutritionLibrary.open();
    await nutritionLibrary.edit(othersFood.name);
    const othersFoodId = await foodEditor.foodId();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    for (const foodId of [UNKNOWN_FOOD_ID, NOT_A_FOOD_ID, othersFoodId]) {
      // act
      await foodEditor.open(foodId);

      // assert
      await nutritionLibrary.expectOpen();
      await nutritionLibrary.expectEmpty();
    }

    // act
    const answer = await foodRequests.edit(
      othersFoodId,
      oatsNamed(`Taken over ${scenarioTag}`),
    );

    // assert
    expect(answer.status).toBe(404);
  },
);

test(
  "Cancel and the back link return to the library without saving",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodEditor,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const saved = `Porridge oats ${scenarioTag}`;
    const discarded = `Instant oats ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(saved));
    await nutritionLibrary.open();
    await nutritionLibrary.edit(saved);
    await foodEditor.enter({ name: discarded, kcal: "400" });

    // act
    await foodEditor.cancel();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectNotListed(discarded);

    // act
    await nutritionLibrary.edit(saved);
    await foodEditor.enter({ name: discarded, kcal: "400" });
    await foodEditor.goBack();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectNotListed(discarded);
    await nutritionLibrary.expectListed({
      name: saved,
      category: "Carb",
      kcal: "389",
      protein: "16.9",
      carb: "66.3",
      fat: "6.9",
      tags: ["Breakfast"],
    });

    // act
    await nutritionLibrary.startNewFood();
    await foodEditor.enter({ name: discarded });
    await foodEditor.cancel();

    // assert
    await nutritionLibrary.expectOpen();
    await nutritionLibrary.expectNotListed(discarded);
  },
);

test(
  "a signed-out visitor and a signed-in client are refused the library, the editor and every food endpoint",
  { tag: "@completeness" },
  async ({
    accountPortal,
    coachDashboard,
    foodEditor,
    nutritionLibrary,
    foodRequests,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    scenarioTag,
    signIn,
    signInAsCoach,
    visitorFoodRequests,
  }) => {
    // arrange
    const kept = oatsNamed(`Steel-cut oats ${scenarioTag}`);
    await provisionCoach();
    await provisionAccount("CLIENT");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(kept);
    await nutritionLibrary.open();
    await nutritionLibrary.edit(kept.name);
    const foodId = await foodEditor.foodId();
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorStatuses = [
      (await visitorFoodRequests.create(oatsNamed(`Visitor ${scenarioTag}`)))
        .status,
      (await visitorFoodRequests.edit(foodId, oatsNamed("Visitor"))).status,
    ];

    // assert
    expect(visitorStatuses).toEqual([401, 401]);

    for (const open of [
      () => nutritionLibrary.open(),
      () => foodEditor.openNew(),
      () => foodEditor.open(foodId),
    ]) {
      // act
      await open();

      // assert
      await accountPortal.expectEmailStepVisible();
    }

    // arrange
    await page.goto("/store");
    await signIn();

    for (const open of [
      () => nutritionLibrary.open(),
      () => foodEditor.openNew(),
      () => foodEditor.open(foodId),
    ]) {
      // act
      await open();

      // assert
      await nutritionLibrary.expectRefused();
    }

    // act
    const clientStatuses = [
      (await foodRequests.create(oatsNamed(`Client ${scenarioTag}`))).status,
      (await foodRequests.edit(foodId, oatsNamed("Client"))).status,
    ];

    // assert
    expect(clientStatuses).toEqual([403, 403]);
  },
);

test(
  "the coach opens her recipes, composes a recipe from two foods, finds its card with the calculated macros and edits it",
  { tag: "@critical" },
  async ({
    coachDashboard,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const yoghurt = `Greek yoghurt ${scenarioTag}`;
    const created: SavedRecipe = {
      name: `Oat and yoghurt bowl ${scenarioTag}`,
      ingredients: [
        { food: oats, grams: "60", method: "Boiled" },
        { food: yoghurt, grams: "150", method: "Raw" },
      ],
      prepMinutes: "10",
      cookMinutes: "5",
      instructions: "Simmer the oats, then top them with the yoghurt.",
      icon: "Smoothie",
      tags: ["Breakfast", "Anti-inflammatory"],
      macros: { kcal: "379", protein: "24", carb: "46", fat: "12" },
    };
    const edited: RecipeCard = {
      name: created.name,
      minutes: "15",
      macros: { kcal: "194", protein: "18", carb: "8", fat: "10" },
      tags: ["Breakfast", "Anti-inflammatory"],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await foodRequests.createAccepted(yoghurtNamed(yoghurt));
    await nutritionLibrary.open();

    // act
    await nutritionLibrary.openRecipes();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectRecipesEmpty();

    // act
    await nutritionLibrary.startNewRecipe();

    // assert
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.addFood(oats);
    await recipeBuilder.addFood(yoghurt);

    // assert
    await recipeBuilder.expectIngredients([
      { food: oats, grams: "40", method: "Raw" },
      { food: yoghurt, grams: "150", method: "Raw" },
    ]);
    await recipeBuilder.expectMacros({
      kcal: "301",
      protein: "20",
      carb: "32",
      fat: "10",
    });

    // act
    await recipeBuilder.setGrams(oats, "60");
    await recipeBuilder.chooseMethod(oats, "Boiled");
    await recipeBuilder.enterDetails({
      name: created.name,
      prepMinutes: created.prepMinutes,
      cookMinutes: created.cookMinutes,
      instructions: created.instructions,
    });
    await recipeBuilder.toggleTag("Anti-inflammatory");
    await recipeBuilder.toggleTag("Breakfast");
    await recipeBuilder.chooseIcon("Smoothie");

    // assert
    await recipeBuilder.expectEntries(created);

    // act
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipeCard({
      name: created.name,
      minutes: "15",
      macros: created.macros,
      tags: created.tags,
    });

    // act
    await nutritionLibrary.editRecipe(created.name);

    // assert
    await recipeBuilder.expectEditing(created);

    // act
    await recipeBuilder.setGrams(yoghurt, "200");
    await recipeBuilder.removeIngredient(oats);

    // assert
    await recipeBuilder.expectIngredients([
      { food: yoghurt, grams: "200", method: "Raw" },
    ]);
    await recipeBuilder.expectMacros(edited.macros);

    // act
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe updated");
    await nutritionLibrary.expectRecipeCard(edited);

    // act
    await page.reload();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectRecipeCard(edited);
  },
);

test(
  "a food dragged onto the ingredient zone joins the recipe with its default portion and Raw, as often as she drops it",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const yoghurt = `Greek yoghurt ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await foodRequests.createAccepted(yoghurtNamed(yoghurt));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.dragFood(oats);

    // assert
    await recipeBuilder.expectIngredients([
      { food: oats, grams: "40", method: "Raw" },
    ]);
    await recipeBuilder.expectMacros({
      kcal: "156",
      protein: "7",
      carb: "27",
      fat: "3",
    });

    // act
    await recipeBuilder.dragFood(yoghurt);
    await recipeBuilder.dragFood(oats);

    // assert
    await recipeBuilder.expectIngredients([
      { food: oats, grams: "40", method: "Raw" },
      { food: yoghurt, grams: "150", method: "Raw" },
      { food: oats, grams: "40", method: "Raw" },
    ]);
    await recipeBuilder.expectMacros({
      kcal: "457",
      protein: "27",
      carb: "59",
      fat: "13",
    });
  },
);

test(
  "the library search narrows the foods by name and the + adds the same food as often as she presses it",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const yoghurt = `Greek yoghurt ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await foodRequests.createAccepted(yoghurtNamed(yoghurt));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.searchFoods("  ROLLED ");

    // assert
    await recipeBuilder.expectOffered([oats]);

    // act
    await recipeBuilder.searchFoods("no such food");

    // assert
    await recipeBuilder.expectOffered([]);

    // act
    await recipeBuilder.searchFoods("");

    // assert
    await recipeBuilder.expectOffered([oats, yoghurt]);

    // act
    await recipeBuilder.addFood(oats);
    await recipeBuilder.addFood(oats);

    // assert
    await recipeBuilder.expectIngredients([
      { food: oats, grams: "40", method: "Raw" },
      { food: oats, grams: "40", method: "Raw" },
    ]);
    await recipeBuilder.expectMacros({
      kcal: "311",
      protein: "14",
      carb: "53",
      fat: "6",
    });
    await recipeBuilder.expectOffered([oats, yoghurt]);
  },
);

test(
  "an archived food already in the recipe stays listed, editable and saved with it, and the library no longer offers it",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRecords,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const yoghurt = `Greek yoghurt ${scenarioTag}`;
    const composed: SavedRecipe = {
      name: `Yoghurt bowl ${scenarioTag}`,
      ingredients: [
        { food: oats, grams: "40", method: "Raw" },
        { food: yoghurt, grams: "150", method: "Raw" },
      ],
      prepMinutes: "0",
      cookMinutes: "0",
      instructions: "",
      icon: null,
      tags: [],
      macros: { kcal: "301", protein: "20", carb: "32", fat: "10" },
    };
    const edited: RecipeCard = {
      name: composed.name,
      minutes: "0",
      macros: { kcal: "457", protein: "27", carb: "59", fat: "13" },
      tags: [],
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await foodRequests.createAccepted(yoghurtNamed(yoghurt));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();
    await recipeBuilder.addFood(oats);
    await recipeBuilder.addFood(yoghurt);
    await recipeBuilder.enterDetails({ name: composed.name });
    await recipeBuilder.save();
    await nutritionLibrary.expectConfirmation("Recipe created");
    await foodRecords.archive(oats);

    // act
    await nutritionLibrary.editRecipe(composed.name);

    // assert
    await recipeBuilder.expectEditing(composed);
    await recipeBuilder.expectOffered([yoghurt]);

    // act
    await recipeBuilder.setGrams(oats, "80");

    // assert
    await recipeBuilder.expectMacros(edited.macros);

    // act
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe updated");
    await nutritionLibrary.expectRecipeCard(edited);

    // act
    await nutritionLibrary.editRecipe(composed.name);
    await recipeBuilder.removeIngredient(oats);

    // assert
    await recipeBuilder.expectIngredients([
      { food: yoghurt, grams: "150", method: "Raw" },
    ]);
    await recipeBuilder.expectOffered([yoghurt]);

    // act
    await recipeBuilder.openNew();

    // assert
    await recipeBuilder.expectNew();
    await recipeBuilder.expectOffered([yoghurt]);
  },
);

test(
  "the builder offers 17 meal icons and None, six cooking methods and 16 tags in four families",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.addFood(oats);

    // assert
    await recipeBuilder.expectChoices(oats);
  },
);

test(
  "a recipe without ingredients or an icon saves, and its card shows no macros, the minutes and no tags",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const created: SavedRecipe = {
      name: `Herbal tea ${scenarioTag}`,
      ingredients: [],
      prepMinutes: "0",
      cookMinutes: "3",
      instructions: "",
      icon: null,
      tags: [],
      macros: NO_MACROS,
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();
    await recipeBuilder.enterDetails({
      name: created.name,
      prepMinutes: "",
      cookMinutes: created.cookMinutes,
    });

    // act
    await recipeBuilder.chooseIcon("Coffee");
    await recipeBuilder.chooseIcon(null);

    // assert
    await recipeBuilder.expectNoProblems();
    await recipeBuilder.expectSaveAvailable();

    // act
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipeCard({
      name: created.name,
      minutes: "3",
      macros: NO_MACROS,
      tags: [],
    });

    // act
    await nutritionLibrary.editRecipe(created.name);

    // assert
    await recipeBuilder.expectEditing(created);
  },
);

test(
  "the builder shows each problem under its field, announced with the field, and saves nothing until they clear",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const takenName = `Porridge ${scenarioTag}`;
    const grams = `Grams of ${oats}` as const;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await recipeRequests.createAccepted(saladNamed(takenName));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.enterDetails({ name: `Overnight oats ${scenarioTag}` });

    // assert
    await recipeBuilder.expectNoProblems();
    await recipeBuilder.expectSaveAvailable();

    // act
    await recipeBuilder.enterDetails({ name: "   " });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Recipe name",
      "Give the recipe a name",
    );

    // act
    await recipeBuilder.enterDetails({ name: "n".repeat(81) });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Recipe name",
      "Keep the name to 80 characters",
    );

    // act
    await recipeBuilder.enterDetails({ name: `  ${"n".repeat(80)}  ` });

    // assert
    await recipeBuilder.expectNoProblems();

    // act
    await recipeBuilder.enterDetails({
      name: `  ${takenName.toUpperCase()} `,
    });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Recipe name",
      "A recipe with this name already exists",
    );

    // act
    await recipeBuilder.enterDetails({ name: `Overnight oats ${scenarioTag}` });
    await recipeBuilder.addFood(oats);
    await recipeBuilder.setGrams(oats, "0");

    // assert
    await recipeBuilder.expectOnlyProblem(
      grams,
      "Enter whole grams from 1 to 99,999",
    );

    // act
    await recipeBuilder.setGrams(oats, "1.5");

    // assert
    await recipeBuilder.expectOnlyProblem(
      grams,
      "Enter whole grams from 1 to 99,999",
    );

    // act
    await recipeBuilder.setGrams(oats, "100000");

    // assert
    await recipeBuilder.expectOnlyProblem(
      grams,
      "Enter whole grams from 1 to 99,999",
    );

    // act
    await recipeBuilder.setGrams(oats, "99999");

    // assert
    await recipeBuilder.expectNoProblems();

    // act
    await recipeBuilder.enterDetails({ prepMinutes: "10000" });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Prep (min)",
      "Enter whole minutes up to 9,999",
    );

    // act
    await recipeBuilder.enterDetails({ prepMinutes: "", cookMinutes: "2.5" });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Cook (min)",
      "Enter whole minutes up to 9,999",
    );

    // act
    await recipeBuilder.enterDetails({ cookMinutes: "-1" });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Cook (min)",
      "Enter whole minutes up to 9,999",
    );

    // act
    await recipeBuilder.enterDetails({
      cookMinutes: "9999",
      instructions: "i".repeat(2001),
    });

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Instructions",
      "Keep the instructions to 2,000 characters",
    );

    // act
    await recipeBuilder.enterDetails({ instructions: "i".repeat(2000) });

    // assert
    await recipeBuilder.expectNoProblems();
    await recipeBuilder.expectSaveAvailable();
  },
);

test(
  "a name taken while the builder is open is shown on the name field and her entries stay",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const entered: SavedRecipe = {
      name: `Baked oats ${scenarioTag}`,
      ingredients: [{ food: oats, grams: "60", method: "Baked" }],
      prepMinutes: "5",
      cookMinutes: "20",
      instructions: "Bake until golden.",
      icon: "Cake",
      tags: ["Breakfast"],
      macros: { kcal: "233", protein: "10", carb: "40", fat: "4" },
    };
    const renamed = `${entered.name} with berries`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();
    await recipeBuilder.addFood(oats);
    await recipeBuilder.setGrams(oats, "60");
    await recipeBuilder.chooseMethod(oats, "Baked");
    await recipeBuilder.enterDetails({
      name: entered.name,
      prepMinutes: entered.prepMinutes,
      cookMinutes: entered.cookMinutes,
      instructions: entered.instructions,
    });
    await recipeBuilder.toggleTag("Breakfast");
    await recipeBuilder.chooseIcon("Cake");
    await recipeRequests.createAccepted(
      saladNamed(` ${entered.name.toLowerCase()}`),
    );

    // act
    await recipeBuilder.save();

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Recipe name",
      "A recipe with this name already exists",
    );
    await recipeBuilder.expectFocusOn("Recipe name");
    await recipeBuilder.expectStillNew();
    await recipeBuilder.expectEntries(entered);

    // act
    await recipeBuilder.enterDetails({ name: renamed });
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipeNames([
      entered.name.toLowerCase(),
      renamed,
    ]);
    await nutritionLibrary.expectRecipeCard({
      name: renamed,
      minutes: "25",
      macros: entered.macros,
      tags: entered.tags,
    });
  },
);

test(
  "on a phone the food library opens as a drawer from the top bar, adds a food and closes again",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await setPhoneViewport(page);
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.openLibraryDrawer();
    await recipeBuilder.addFood(oats);
    await recipeBuilder.closeLibraryDrawer();

    // assert
    await recipeBuilder.expectIngredients([
      { food: oats, grams: "40", method: "Raw" },
    ]);
  },
);

test(
  "on a phone a tap beside the food library drawer closes it and returns focus to its button",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    page,
    provisionCoach,
    recipeBuilder,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await setPhoneViewport(page);
    await recipeBuilder.openNew();
    await recipeBuilder.expectNew();
    await recipeBuilder.openLibraryDrawer();

    // act
    await recipeBuilder.closeLibraryDrawerFromBackdrop();

    // assert
    await recipeBuilder.expectIngredients([]);
  },
);

test(
  "an unknown tab in the address opens the Foods tab",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    // act
    await nutritionLibrary.openWithTabParam("unknown");

    // assert
    await nutritionLibrary.expectTab("Foods");
    await nutritionLibrary.expectEmpty();
  },
);

test(
  "the Recipes tab lays her cards out one, two or three to a row as the screen widens",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    for (const name of ["Caesar", "Greek", "Nicoise"]) {
      await recipeRequests.createAccepted(
        saladNamed(`${name} salad ${scenarioTag}`),
      );
    }

    for (const [setViewport, perRow] of [
      [setPhoneViewport, 1],
      [setTabletViewport, 2],
      [setDesktopViewport, 3],
    ] as const) {
      // act
      await setViewport(page);
      await nutritionLibrary.openWithTabParam("recipes");

      // assert
      await nutritionLibrary.expectTab("Recipes");
      await nutritionLibrary.expectRecipesPerRow(perRow);
    }
  },
);

test(
  "the coach composes a recipe by keyboard alone and finds it listed A to Z with meal roles before tags",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    foodRequests,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const oats = `Rolled oats ${scenarioTag}`;
    const yoghurt = `Greek yoghurt ${scenarioTag}`;
    const middle = `Caesar salad ${scenarioTag}`;
    const last = `Dinner salad ${scenarioTag}`;
    const created: SavedRecipe = {
      name: `almond porridge ${scenarioTag}`,
      ingredients: [
        { food: oats, grams: "60", method: "Steamed" },
        { food: yoghurt, grams: "100", method: "Pan-fried" },
      ],
      prepMinutes: "7",
      cookMinutes: "12",
      instructions: "Steam the oats and fold in the yoghurt.",
      icon: "Ice cream",
      tags: ["Luteal", "Snack"],
      macros: { kcal: "330", protein: "19", carb: "44", fat: "9" },
    };
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await foodRequests.createAccepted(oatsNamed(oats));
    await foodRequests.createAccepted(yoghurtNamed(yoghurt));
    await recipeRequests.createAccepted({
      ...saladNamed(last),
      tagIds: ["di-vegetarian", "mt-dinner"],
    });
    await recipeRequests.createAccepted(saladNamed(middle));
    await nutritionLibrary.open();

    // act
    await nutritionLibrary.openRecipesWithKeyboard();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectTabFocused("Recipes");

    // act
    await nutritionLibrary.startNewRecipeWithKeyboard();

    // assert
    await recipeBuilder.expectNew();

    // act
    await recipeBuilder.composeWithKeyboard(created);

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipeNames([created.name, middle, last]);
    await nutritionLibrary.expectRecipeCard({
      name: created.name,
      minutes: "19",
      macros: created.macros,
      tags: ["Snack", "Luteal"],
    });
    await nutritionLibrary.expectRecipeCard({
      ...saladCardOf(last),
      tags: ["Dinner", "Vegetarian"],
    });
  },
);

test(
  "Cancel and the back link return to the Recipes tab without saving",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionCoach,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    // arrange
    const saved = `Garden salad ${scenarioTag}`;
    const discarded = `Winter salad ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeRequests.createAccepted(saladNamed(saved));
    await nutritionLibrary.openWithTabParam("recipes");
    await nutritionLibrary.editRecipe(saved);
    await recipeBuilder.expectEditing({
      name: saved,
      ingredients: [],
      prepMinutes: "5",
      cookMinutes: "10",
      instructions: "",
      icon: "Salad",
      tags: ["Lunch", "Vegetarian"],
      macros: NO_MACROS,
    });
    await recipeBuilder.enterDetails({ name: discarded, prepMinutes: "40" });

    // act
    await recipeBuilder.cancel();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectRecipeNames([saved]);
    await nutritionLibrary.expectRecipeCard(saladCardOf(saved));

    // act
    await nutritionLibrary.editRecipe(saved);
    await recipeBuilder.enterDetails({ name: discarded, prepMinutes: "40" });
    await recipeBuilder.goBack();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectRecipeNames([saved]);
    await nutritionLibrary.expectRecipeCard(saladCardOf(saved));

    // act
    await nutritionLibrary.startNewRecipe();
    await recipeBuilder.expectNew();
    await recipeBuilder.enterDetails({ name: discarded });
    await recipeBuilder.cancel();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    await nutritionLibrary.expectRecipeNames([saved]);
  },
);

test(
  "an unknown recipe or another coach's recipe returns the coach to the Recipes tab",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    // arrange
    const othersRecipe = saladNamed(`Caesar salad ${scenarioTag}`);
    await provisionAccount("COACH");
    await provisionCoach();
    await page.goto("/store");
    await signIn();
    await recipeRequests.createAccepted(othersRecipe);
    await nutritionLibrary.openWithTabParam("recipes");
    await nutritionLibrary.editRecipe(othersRecipe.name);
    const othersRecipeId = await recipeBuilder.recipeId();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();

    for (const recipeId of [
      UNKNOWN_RECIPE_ID,
      NOT_A_RECIPE_ID,
      othersRecipeId,
    ]) {
      // act
      await recipeBuilder.open(recipeId);

      // assert
      await nutritionLibrary.expectTab("Recipes");
      await nutritionLibrary.expectRecipesEmpty();
    }

    // act
    const answer = await recipeRequests.edit(
      othersRecipeId,
      saladNamed(`Taken over ${scenarioTag}`),
    );

    // assert
    expect(answer.status).toBe(404);
  },
);

test(
  "a signed-out visitor and a signed-in client are refused the Recipes tab, the builder and every recipe endpoint",
  { tag: "@completeness" },
  async ({
    accountPortal,
    coachDashboard,
    nutritionLibrary,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    recipeBuilder,
    recipeRequests,
    scenarioTag,
    signIn,
    signInAsCoach,
    visitorRecipeRequests,
  }) => {
    // arrange
    const kept = saladNamed(`Nicoise salad ${scenarioTag}`);
    await provisionCoach();
    await provisionAccount("CLIENT");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeRequests.createAccepted(kept);
    await nutritionLibrary.openWithTabParam("recipes");
    await nutritionLibrary.editRecipe(kept.name);
    const recipeId = await recipeBuilder.recipeId();
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorStatuses = [
      (await visitorRecipeRequests.create(saladNamed(`Visitor ${scenarioTag}`)))
        .status,
      (await visitorRecipeRequests.edit(recipeId, saladNamed("Visitor")))
        .status,
    ];

    // assert
    expect(visitorStatuses).toEqual([401, 401]);

    for (const open of [
      () => nutritionLibrary.openWithTabParam("recipes"),
      () => recipeBuilder.openNew(),
      () => recipeBuilder.open(recipeId),
    ]) {
      // act
      await open();

      // assert
      await accountPortal.expectEmailStepVisible();
    }

    // arrange
    await page.goto("/store");
    await signIn();

    for (const open of [
      () => nutritionLibrary.openWithTabParam("recipes"),
      () => recipeBuilder.openNew(),
      () => recipeBuilder.open(recipeId),
    ]) {
      // act
      await open();

      // assert
      await nutritionLibrary.expectRefused();
    }

    // act
    const clientStatuses = [
      (await recipeRequests.create(saladNamed(`Client ${scenarioTag}`))).status,
      (await recipeRequests.edit(recipeId, saladNamed("Client"))).status,
    ];

    // assert
    expect(clientStatuses).toEqual([403, 403]);
  },
);
