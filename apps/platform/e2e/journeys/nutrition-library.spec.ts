import { expect, test } from "../support/fixtures";
import type { SavedFood } from "../support/food-editor-page";
import type { FoodFields } from "../support/food-requests";

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

test(
  "the coach reaches her food library from the menu, creates a food with its values and tags, finds it listed and edits it",
  { tag: "@critical" },
  async ({
    coachDashboard,
    foodEditor,
    foodLibrary,
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
    await foodLibrary.openFromNavigation();

    // assert
    await foodLibrary.expectNutritionRightAfterTraining();

    // act
    await foodLibrary.startNewFood();

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
    await foodLibrary.expectOpen();
    await foodLibrary.expectConfirmation("Food created");
    await foodLibrary.expectListed({
      name: created.name,
      category: created.category,
      kcal: created.kcal,
      protein: created.protein,
      carb: created.carb,
      fat: created.fat,
      tags: created.tags,
    });

    // act
    await foodLibrary.edit(created.name);

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
    await foodLibrary.expectOpen();
    await foodLibrary.expectConfirmation("Food updated");
    await foodLibrary.expectListed({
      name: edited.name,
      category: edited.category,
      kcal: edited.kcal,
      protein: edited.protein,
      carb: edited.carb,
      fat: edited.fat,
      tags: ["Luteal", "Vegetarian"],
    });
    await foodLibrary.expectNotListed(created.name);

    // act
    await foodLibrary.edit(edited.name);

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
    await foodEditor.enter({ fat: "", defaultPortionGrams: "100000" });

    // assert
    await foodEditor.expectOnlyProblem(
      "Default portion (g)",
      "Enter whole grams up to 99,999",
    );

    // act
    await foodEditor.enter({ defaultPortionGrams: "" });

    // assert
    await foodEditor.expectNoProblems();
    await foodEditor.expectCreateAvailable();
  },
);

test(
  "a signed-out visitor and a signed-in client are refused the library, the editor and every food endpoint",
  { tag: "@completeness" },
  async ({
    accountPortal,
    coachDashboard,
    foodEditor,
    foodLibrary,
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
    await foodLibrary.open();
    await foodLibrary.edit(kept.name);
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
      () => foodLibrary.open(),
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
      () => foodLibrary.open(),
      () => foodEditor.openNew(),
      () => foodEditor.open(foodId),
    ]) {
      // act
      await open();

      // assert
      await foodLibrary.expectRefused();
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
