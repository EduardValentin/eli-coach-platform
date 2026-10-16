import { expect, test } from "../support/fixtures";
import type { SavedFood } from "../support/food-editor-page";
import type { FoodFields } from "../support/food-requests";
import { setPhoneViewport } from "../support/viewport";

const UNKNOWN_FOOD_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOT_A_FOOD_ID = "not-a-food";

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
