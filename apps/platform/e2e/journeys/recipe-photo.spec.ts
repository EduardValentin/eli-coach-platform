import { expect, test } from "../support/fixtures";
import {
  RecipePhotoSamples,
  storedRecipePhotoIds,
} from "../support/recipe-photo-files";
import type { RecipeFields } from "../support/recipe-requests";

const NOT_FOUND = 404;
const ONE_YEAR_IMMUTABLE = "private, max-age=31536000, immutable";
const SAVE_DELAY_MS = 1500;
const FEATURE_FLAG_COOKIE = "__eli_feature_flags";

const recipePhotos = new RecipePhotoSamples();

function saladNamed(name: string): RecipeFields {
  return {
    name,
    ingredients: [],
    prepMinutes: 5,
    cookMinutes: 10,
    instructions: "",
    icon: "salad",
    tagIds: [],
  };
}

test(
  "the recipe photo is chosen, replaced and removed by keyboard, sits under an overlay bar on the preview and is discarded by Cancel and the back arrow",
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
    const name = `Keyboard bowl ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeBuilder.openNew();
    await recipeBuilder.enterDetails({ name });
    const storedBefore = storedRecipePhotoIds();

    // act
    await recipeBuilder.choosePhotoWithKeyboard(
      await recipePhotos.cameraJpeg(),
    );

    // assert
    await recipeBuilder.expectPhotoShown(name);
    await recipeBuilder.expectFocusOnReplacePhoto();
    await recipeBuilder.expectOverlayBarAlongTopEdgeOf(name);

    // act
    await recipeBuilder.removePhotoWithKeyboard();

    // assert
    await recipeBuilder.expectNoPhoto(name);
    await recipeBuilder.expectFocusOnUploadPhoto();

    // act
    await recipeBuilder.attachPhoto(await recipePhotos.screenshotPng());
    await recipeBuilder.expectPhotoShown(name);
    await recipeBuilder.cancel();

    // assert
    await nutritionLibrary.expectTab("Recipes");
    expect(storedRecipePhotoIds()).toEqual(storedBefore);

    // act
    await nutritionLibrary.startNewRecipe();
    await recipeBuilder.expectNew();

    // assert
    await recipeBuilder.expectNoPhoto("Recipe");

    // act
    await recipeBuilder.attachPhoto(await recipePhotos.screenshotPng());
    await recipeBuilder.expectPhotoShown("Recipe");
    await recipeBuilder.goBack();
    await nutritionLibrary.startNewRecipe();
    await recipeBuilder.expectNew();

    // assert
    await recipeBuilder.expectNoPhoto("Recipe");
    expect(storedRecipePhotoIds()).toEqual(storedBefore);
  },
);

test(
  "while the photo uploads Save reads Saving and cannot be sent twice, and a save the server refuses keeps her entries and the photo",
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
    const name = `Slow bowl ${scenarioTag}`;
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeBuilder.openNew();
    await recipeBuilder.enterDetails({ name });
    await recipeBuilder.attachPhoto(await recipePhotos.cameraJpeg());
    const savesSent = await recipeBuilder.delayNextSave(SAVE_DELAY_MS);

    // act
    await recipeBuilder.save();

    // assert
    await recipeBuilder.expectSaving();

    // act
    await recipeBuilder.submitWhileSaving();

    // assert
    await nutritionLibrary.expectConfirmation("Recipe created");
    expect(savesSent()).toBe(1);
    await nutritionLibrary.expectRecipePhoto(name);

    // arrange
    const takenName = `Taken bowl ${scenarioTag}`;
    await nutritionLibrary.startNewRecipe();
    await recipeBuilder.expectNew();
    await recipeBuilder.enterDetails({ name: takenName, prepMinutes: "7" });
    await recipeBuilder.attachPhoto(await recipePhotos.screenshotPng());
    await recipeRequests.createAccepted(saladNamed(takenName));

    // act
    await recipeBuilder.save();

    // assert
    await recipeBuilder.expectOnlyProblem(
      "Recipe name",
      "A recipe with this name already exists",
    );
    await recipeBuilder.expectStillNew();
    await recipeBuilder.expectPhotoShown(takenName);

    // act
    await recipeBuilder.enterDetails({ name: `${takenName} again` });
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipePhoto(`${takenName} again`);
  },
);

test(
  "a recipe photo that fails to load falls back to the icon, and the served file is a private, immutable, sniff-proof WebP",
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
    const salad = saladNamed(`Failing photo ${scenarioTag}`);
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeRequests.createWithPhotoAccepted(
      salad,
      await recipePhotos.cameraJpeg(),
    );
    await nutritionLibrary.openWithTabParam("recipes");
    const photoPath = await nutritionLibrary.recipePhotoPath(salad.name);
    await page.context().clearCookies({ name: FEATURE_FLAG_COOKIE });

    // act
    const served = await recipeRequests.openPhoto(photoPath);

    // assert
    expect(served.status).toBe(200);
    expect(served.headers["cache-control"]).toBe(ONE_YEAR_IMMUTABLE);
    expect(served.headers["x-content-type-options"]).toBe("nosniff");

    // act
    await nutritionLibrary.blockRecipePhotos();
    await coachDashboard.open();
    await nutritionLibrary.openFromNavigation();
    await nutritionLibrary.openRecipes();

    // assert
    await nutritionLibrary.expectRecipeIcon(salad.name);
  },
);

test(
  "a recipe photo that fails to load on a fresh page load falls back to the icon",
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
    const salad = saladNamed(`Failing reload ${scenarioTag}`);
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeRequests.createWithPhotoAccepted(
      salad,
      await recipePhotos.cameraJpeg(),
    );
    await nutritionLibrary.blockRecipePhotos();

    // act
    await nutritionLibrary.openWithTabParam("recipes");

    // assert
    await nutritionLibrary.expectRecipeIcon(salad.name);
  },
);

test(
  "another coach and a signed-out visitor get not found on a recipe photo and cannot upload one",
  { tag: "@completeness" },
  async ({
    coachDashboard,
    nutritionLibrary,
    page,
    provisionAccount,
    provisionCoach,
    publicNav,
    recipeRequests,
    scenarioTag,
    signIn,
    signInAsCoach,
    visitorRecipeRequests,
  }) => {
    // arrange
    const salad = saladNamed(`Private photo ${scenarioTag}`);
    await provisionAccount("COACH");
    await provisionCoach();
    await page.goto("/store");
    await signIn();
    await coachDashboard.open();
    await recipeRequests.createWithPhotoAccepted(
      salad,
      await recipePhotos.cameraJpeg(),
    );
    await nutritionLibrary.openWithTabParam("recipes");
    const photoPath = await nutritionLibrary.recipePhotoPath(salad.name);
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorRead = await visitorRecipeRequests.openPhoto(photoPath);
    const visitorUpload = await visitorRecipeRequests.createWithPhoto(
      saladNamed(`Visitor ${scenarioTag}`),
      await recipePhotos.cameraJpeg(),
    );

    // assert
    expect(visitorRead.status).toBe(NOT_FOUND);
    expect([401, 403, 404]).toContain(visitorUpload.status);

    // arrange
    await page.goto("/store");
    await signInAsCoach();

    // act
    const otherCoach = await recipeRequests.openPhoto(photoPath);

    // assert
    expect(otherCoach.status).toBe(NOT_FOUND);
  },
);

test(
  "the recipe photo takes a WebP and a PNG just under 10 MB",
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
    const webpName = `Pink bowl ${scenarioTag}`;
    const heavyName = `Heavy bowl ${scenarioTag}`;
    const heavy = await recipePhotos.justUnderTheCap();
    expect(heavy.buffer.length).toBeGreaterThan(9 * 1024 * 1024);
    expect(heavy.buffer.length).toBeLessThan(10 * 1024 * 1024);
    await provisionCoach();
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await recipeBuilder.openNew();
    await recipeBuilder.enterDetails({ name: webpName });

    // act
    await recipeBuilder.attachPhoto(await recipePhotos.webp());
    await recipeBuilder.expectPhotoShown(webpName);
    await recipeBuilder.expectNoPhotoProblem();
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipePhoto(webpName);

    // act
    await nutritionLibrary.startNewRecipe();
    await recipeBuilder.expectNew();
    await recipeBuilder.enterDetails({ name: heavyName });
    await recipeBuilder.attachPhoto(heavy);
    await recipeBuilder.expectPhotoShown(heavyName);
    await recipeBuilder.expectNoPhotoProblem();
    await recipeBuilder.save();

    // assert
    await nutritionLibrary.expectConfirmation("Recipe created");
    await nutritionLibrary.expectRecipePhoto(heavyName);
  },
);
