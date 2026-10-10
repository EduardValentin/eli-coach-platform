import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  mealPlanPdf,
  postureGuideImage,
  recipesDoc,
} from "../support/sample-resources";
import {
  expectNoHorizontalScroll,
  setDesktopViewport,
  setPhoneViewport,
} from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 240_000;

const ACTIVATION = { title: "Activation drills", description: "" };

const RECIPES = { title: "Family recipes", description: "" };

const POSTURE = { title: "Posture guide", description: "" };

const MEALS = { title: "Week one meals", description: "" };

const MEAL_PLAN_TITLE = "Meal plan week 1";

function scenarioTagsOf(scenarioTag: string) {
  return {
    glutes: `Glutes ${scenarioTag}`,
    gluteActivation: `Glute activation ${scenarioTag}`,
    mobility: `Mobility ${scenarioTag}`,
    nutrition: `Nutrition ${scenarioTag}`,
    warmUp: `Warm-up ${scenarioTag}`,
  };
}

test(
  "the coach tags a resource with a suggested and a new tag and finds it by tag, title and order through a reload, and her client finds it by the same tag and title",
  { tag: "@critical" },
  async ({
    addResourceDialog,
    clientResources,
    coachClientResources,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceRequests,
    resourceToolbar,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    const mealPlan = await mealPlanPdf();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...ACTIVATION,
      tags: [tags.glutes],
    });
    await resourceRequests.add(client.clientId, recipesDoc(), RECIPES);
    const coachProblems = collectPageProblems(page);
    await coachClientResources.open(client.clientId);

    // act
    await coachClientResources.openAdd();
    await addResourceDialog.choose(mealPlan);
    await addResourceDialog.tags.type(scenarioTag);

    // assert
    await addResourceDialog.tags.expectSuggestions([
      tags.glutes,
      `Create “${scenarioTag}”`,
    ]);

    // act
    await addResourceDialog.tags.chooseSuggestion(tags.glutes);
    await addResourceDialog.tags.create(tags.mobility);

    // assert
    await addResourceDialog.tags.expectChips([tags.glutes, tags.mobility]);

    // act
    await addResourceDialog.tags.leave();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards([
      MEAL_PLAN_TITLE,
      RECIPES.title,
      ACTIVATION.title,
    ]);
    await coachClientResources.expectCard({
      title: MEAL_PLAN_TITLE,
      type: "PDF",
      pages: 3,
      tags: [tags.glutes, tags.mobility],
    });
    await coachClientResources.expectCard({
      title: ACTIVATION.title,
      type: "IMG",
      tags: [tags.glutes],
    });
    await resourceToolbar.expectTagOptions(3, [
      { tag: tags.glutes, count: 2 },
      { tag: tags.mobility, count: 1 },
    ]);

    // act
    await resourceToolbar.chooseTag(tags.glutes);

    // assert
    await coachClientResources.expectCards([MEAL_PLAN_TITLE, ACTIVATION.title]);

    // act
    await resourceToolbar.search("drills");

    // assert
    await coachClientResources.expectCards([ACTIVATION.title]);
    await resourceToolbar.expectTagOptions(1, [
      { tag: tags.glutes, count: 1 },
      { tag: tags.mobility, count: 0 },
    ]);

    // act
    await resourceToolbar.clearSearch();
    await resourceToolbar.chooseSort("Title");

    // assert
    await resourceToolbar.expectSort({ key: "Title", direction: "A to Z" });
    await coachClientResources.expectCards([ACTIVATION.title, MEAL_PLAN_TITLE]);

    // act
    await resourceToolbar.toggleDirection();

    // assert
    await resourceToolbar.expectSort({ key: "Title", direction: "Z to A" });
    await coachClientResources.expectCards([MEAL_PLAN_TITLE, ACTIVATION.title]);

    // act
    await resourceToolbar.toggleDirection();

    // assert
    await resourceToolbar.expectSort({ key: "Title", direction: "A to Z" });
    await coachClientResources.expectCards([ACTIVATION.title, MEAL_PLAN_TITLE]);

    // act
    await coachClientResources.reload();

    // assert
    await resourceToolbar.expectChosenTag(tags.glutes);
    await resourceToolbar.expectSort({ key: "Title", direction: "A to Z" });
    await coachClientResources.expectCards([ACTIVATION.title, MEAL_PLAN_TITLE]);

    // act
    await resourceToolbar.chooseSort("Date added");

    // assert
    await resourceToolbar.expectSort({
      key: "Date added",
      direction: "Newest first",
    });
    await coachClientResources.expectCards([MEAL_PLAN_TITLE, ACTIVATION.title]);
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);

    // act
    await clientResources.open();

    // assert
    await resourceToolbar.expectNoSort();
    await resourceToolbar.expectTagOptions(3, [
      { tag: tags.glutes, count: 2 },
      { tag: tags.mobility, count: 1 },
    ]);

    // act
    await resourceToolbar.chooseTag(tags.glutes);

    // assert
    await clientResources.expectCards([MEAL_PLAN_TITLE, ACTIVATION.title]);
    await clientResources.expectNew({
      title: MEAL_PLAN_TITLE,
      type: "PDF",
      pages: 3,
      tags: [tags.glutes, tags.mobility],
    });

    // act
    await resourceToolbar.search("meal");

    // assert
    await clientResources.expectCards([MEAL_PLAN_TITLE]);
    await resourceToolbar.expectChosenTag(tags.glutes);
    expect(clientProblems).toEqual([]);
  },
);

test(
  "the coach tags a resource by keyboard alone: Enter and a comma commit, Backspace and a tag's remove button drop, and Escape closes the suggestions before the dialog",
  { tag: "@completeness" },
  async ({
    addResourceDialog,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    scenarioTag,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    const mealPlan = await mealPlanPdf();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, recipesDoc(), {
      ...RECIPES,
      tags: [tags.glutes],
    });
    await coachClientResources.open(client.clientId);
    await coachClientResources.openAddWithKeyboard();
    await addResourceDialog.chooseWithKeyboard(mealPlan);
    await addResourceDialog.tags.focusWithKeyboard();

    // act
    await addResourceDialog.tags.type(scenarioTag);

    // assert
    await addResourceDialog.tags.expectSuggestions([
      tags.glutes,
      `Create “${scenarioTag}”`,
    ]);

    // act
    await addResourceDialog.tags.commitWithEnter();

    // assert
    await addResourceDialog.tags.expectChips([tags.glutes]);

    // act
    await addResourceDialog.tags.type(tags.mobility);
    await addResourceDialog.tags.commitWithComma();

    // assert
    await addResourceDialog.tags.expectChips([tags.glutes, tags.mobility]);

    // act
    await addResourceDialog.tags.type(tags.warmUp);

    // assert
    await addResourceDialog.tags.expectSuggestions([`Create “${tags.warmUp}”`]);

    // act
    await addResourceDialog.tags.closeSuggestions();

    // assert
    await addResourceDialog.expectOpen();

    // act
    await addResourceDialog.tags.commitWithComma();

    // assert
    await addResourceDialog.tags.expectChips([
      tags.glutes,
      tags.mobility,
      tags.warmUp,
    ]);

    // act
    await addResourceDialog.tags.removeLast();

    // assert
    await addResourceDialog.tags.expectChips([tags.glutes, tags.mobility]);

    // act
    await addResourceDialog.tags.remove(tags.glutes);

    // assert
    await addResourceDialog.tags.expectChips([tags.mobility]);

    // act
    await addResourceDialog.submitWithKeyboard();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards([MEAL_PLAN_TITLE, RECIPES.title]);
    await coachClientResources.expectCard({
      title: MEAL_PLAN_TITLE,
      type: "PDF",
      pages: 3,
      tags: [tags.mobility],
    });
  },
);

test(
  "a tag typed in another case attaches the stored spelling, and a resource holds it once",
  { tag: "@completeness" },
  async ({
    addResourceDialog,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    resourceToolbar,
    resourceViewer,
    scenarioTag,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.glutes],
    });
    await coachClientResources.open(client.clientId);
    await coachClientResources.openAdd();
    await addResourceDialog.choose(recipesDoc());

    // act
    await addResourceDialog.tags.type(tags.glutes.toUpperCase());
    await addResourceDialog.tags.commitWithComma();
    await addResourceDialog.tags.type(tags.glutes.toLowerCase());
    await addResourceDialog.tags.commitWithComma();

    // assert
    await addResourceDialog.tags.expectChips([tags.glutes]);

    // act
    await addResourceDialog.tags.leave();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCard({
      title: "Recipes",
      type: "DOC",
      tags: [tags.glutes],
    });
    await resourceToolbar.expectTagOptions(2, [{ tag: tags.glutes, count: 2 }]);

    // act
    await resourceRequests.add(client.clientId, await mealPlanPdf(), {
      ...MEALS,
      tags: [tags.glutes.toUpperCase(), tags.glutes.toLowerCase()],
    });
    await coachClientResources.reload();

    // assert
    await coachClientResources.expectCard({
      title: MEALS.title,
      type: "PDF",
      pages: 3,
      tags: [tags.glutes],
    });
    await resourceToolbar.expectTagOptions(3, [{ tag: tags.glutes, count: 3 }]);

    // act
    await coachClientResources.openResource(MEALS.title);

    // assert
    await resourceViewer.expectTags([tags.glutes]);
  },
);

test(
  "a client's tag options are hers alone while the coach's suggestions span every client",
  { tag: "@completeness" },
  async ({
    addResourceDialog,
    clientResources,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceRequests,
    resourceToolbar,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    const otherClient = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.glutes],
    });
    await resourceRequests.add(otherClient.clientId, recipesDoc(), {
      ...RECIPES,
      tags: [tags.mobility],
    });

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await resourceToolbar.expectTagOptions(1, [{ tag: tags.glutes, count: 1 }]);

    // act
    await coachClientResources.openAdd();
    await addResourceDialog.tags.type(scenarioTag);

    // assert
    await addResourceDialog.tags.expectSuggestions([
      tags.glutes,
      tags.mobility,
      `Create “${scenarioTag}”`,
    ]);

    // act
    await coachClientResources.open(otherClient.clientId);

    // assert
    await resourceToolbar.expectTagOptions(1, [
      { tag: tags.mobility, count: 1 },
    ]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientResources.open();

    // assert
    await clientResources.expectCards([POSTURE.title]);
    await resourceToolbar.expectTagOptions(1, [{ tag: tags.glutes, count: 1 }]);
  },
);

test(
  "the tag filter falls back to All tags when its last holder is edited and when it is deleted",
  { tag: "@completeness" },
  async ({
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceDetailsDialog,
    resourceRequests,
    resourceToolbar,
    resourceViewer,
    scenarioTag,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.glutes],
    });
    await resourceRequests.add(client.clientId, recipesDoc(), {
      ...RECIPES,
      tags: [tags.mobility],
    });
    await resourceRequests.add(client.clientId, await mealPlanPdf(), MEALS);
    await coachClientResources.open(client.clientId);
    await resourceToolbar.chooseTag(tags.glutes);
    await coachClientResources.expectCards([POSTURE.title]);

    // act
    await coachClientResources.chooseAction(POSTURE.title, "Edit details");
    await resourceDetailsDialog.tags.remove(tags.glutes);
    await resourceDetailsDialog.tags.leave();
    await resourceDetailsDialog.save();

    // assert
    await resourceDetailsDialog.expectClosed();
    await coachClientResources.expectToast("Changes saved.");
    await resourceToolbar.expectChosenTag("All tags");
    await coachClientResources.expectCards([
      MEALS.title,
      RECIPES.title,
      POSTURE.title,
    ]);
    await coachClientResources.expectCard({
      title: POSTURE.title,
      type: "IMG",
    });
    await resourceToolbar.expectTagOptions(3, [
      { tag: tags.mobility, count: 1 },
    ]);

    // act
    await resourceToolbar.chooseTag(tags.mobility);

    // assert
    await coachClientResources.expectCards([RECIPES.title]);

    // act
    await coachClientResources.openResource(RECIPES.title);
    const deletion = await resourceViewer.delete(RECIPES.title);
    await deletion.confirm();

    // assert
    await deletion.expectClosed();
    await resourceViewer.expectClosed();
    await coachClientResources.expectToast("Resource deleted.");
    await resourceToolbar.expectChosenTag("All tags");
    await coachClientResources.expectCards([MEALS.title, POSTURE.title]);
    await resourceToolbar.expectTagOptions(2, []);
  },
);

test(
  "when nothing matches the coach is offered Clear filters, which brings back her whole list in the order she chose",
  { tag: "@completeness" },
  async ({
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    resourceToolbar,
    scenarioTag,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.glutes],
    });
    await resourceRequests.add(client.clientId, recipesDoc(), {
      ...RECIPES,
      tags: [tags.mobility],
    });
    await resourceRequests.add(client.clientId, await mealPlanPdf(), MEALS);
    await coachClientResources.open(client.clientId);
    await resourceToolbar.chooseSort("Title");

    // act
    await resourceToolbar.chooseTag(tags.glutes);
    await resourceToolbar.search("recipes");

    // assert
    await resourceToolbar.expectNoMatches();

    // act
    await resourceToolbar.clearFilters();

    // assert
    await coachClientResources.expectCards([
      RECIPES.title,
      POSTURE.title,
      MEALS.title,
    ]);
    await resourceToolbar.expectChosenTag("All tags");
    await resourceToolbar.expectSearch("");
    await resourceToolbar.expectSort({ key: "Title", direction: "A to Z" });
  },
);

test(
  "while a client has no resources neither page shows the tag filter, the search or the order",
  { tag: "@completeness" },
  async ({
    clientResources,
    coachClientResources,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceToolbar,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await coachClientResources.expectEmpty(client.firstName);
    await resourceToolbar.expectHidden();

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientResources.open();

    // assert
    await clientResources.expectEmpty();
    await resourceToolbar.expectHidden();
  },
);

test(
  "the chosen tag, the search and the order survive a reload for the coach and the client",
  { tag: "@completeness" },
  async ({
    clientResources,
    coachClientResources,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceRequests,
    resourceToolbar,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.glutes],
    });
    await resourceRequests.add(client.clientId, recipesDoc(), {
      ...RECIPES,
      tags: [tags.glutes],
    });
    await resourceRequests.add(client.clientId, await mealPlanPdf(), {
      ...MEALS,
      tags: [tags.glutes],
    });
    await coachClientResources.open(client.clientId);
    await resourceToolbar.chooseTag(tags.glutes);
    await resourceToolbar.search("re");
    await resourceToolbar.chooseSort("Title");
    await resourceToolbar.toggleDirection();
    await coachClientResources.expectCards([POSTURE.title, RECIPES.title]);

    // act
    await coachClientResources.reload();

    // assert
    await resourceToolbar.expectChosenTag(tags.glutes);
    await resourceToolbar.expectSearch("re");
    await resourceToolbar.expectSort({ key: "Title", direction: "Z to A" });
    await coachClientResources.expectCards([POSTURE.title, RECIPES.title]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientResources.open();
    await resourceToolbar.chooseTag(tags.glutes);
    await resourceToolbar.search("guide");
    await clientResources.expectCards([POSTURE.title]);

    // act
    await clientResources.reload();

    // assert
    await resourceToolbar.expectChosenTag(tags.glutes);
    await resourceToolbar.expectSearch("guide");
    await clientResources.expectCards([POSTURE.title]);
  },
);

test(
  "on a phone a card shows two tags and the rest as a count without wrapping its type and pages, and both find it by tag",
  { tag: "@completeness" },
  async ({
    clientResources,
    coachClientResources,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceRequests,
    resourceToolbar,
    scenarioTag,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const tags = scenarioTagsOf(scenarioTag);
    const manyTags = [
      tags.gluteActivation,
      tags.mobility,
      tags.nutrition,
      tags.warmUp,
    ];
    const manyTaggedMeals = {
      title: MEALS.title,
      type: "PDF",
      pages: 3,
      tags: manyTags,
    };
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, await mealPlanPdf(), {
      ...MEALS,
      tags: manyTags,
    });
    await resourceRequests.add(client.clientId, postureGuideImage(), {
      ...POSTURE,
      tags: [tags.mobility],
    });
    await setPhoneViewport(page);

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await coachClientResources.expectCards([POSTURE.title, MEALS.title]);
    await coachClientResources.expectCard(manyTaggedMeals);
    await coachClientResources.expectMetaRowOnOneLine(MEALS.title);
    await expectNoHorizontalScroll(page);

    // act
    await resourceToolbar.chooseTag(tags.warmUp);

    // assert
    await coachClientResources.expectCards([MEALS.title]);
    await expectNoHorizontalScroll(page);

    // arrange
    await setDesktopViewport(page);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await setPhoneViewport(page);

    // act
    await clientResources.open();

    // assert
    await clientResources.expectCards([POSTURE.title, MEALS.title]);
    await clientResources.expectNew(manyTaggedMeals);
    await clientResources.expectMetaRowOnOneLine(MEALS.title);
    await expectNoHorizontalScroll(page);

    // act
    await resourceToolbar.chooseTag(tags.mobility);

    // assert
    await clientResources.expectCards([POSTURE.title, MEALS.title]);
    await resourceToolbar.expectChosenTag(tags.mobility);
    await expectNoHorizontalScroll(page);
  },
);
