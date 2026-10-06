import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  mealPlanPdf,
  readableSizeOf,
  recipesDoc,
} from "../support/sample-resources";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 240_000;

const MEAL_PLAN = {
  title: "Week one meals",
  description: "Breakfasts and dinners for the first week.",
};

const RECIPES = {
  title: "Family recipes",
  description: "Dinners for the weekend.",
};

const MEAL_PLAN_CARD = { title: MEAL_PLAN.title, type: "PDF", pages: 3 };

const RECIPES_CARD = { title: RECIPES.title, type: "DOC" };

const NO_OTHER_MEASUREMENTS = {
  system: "metric",
  photoConsent: "not-given",
  entries: [],
} as const;

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test("a client finds what her coach gave her marked new, opens, pages and downloads it, and the marks clear once she has opened everything", async ({
  clientDashboard,
  clientPortalShell,
  clientResources,
  page,
  provisionCoach,
  provisionSubmittedClient,
  publicNav,
  resourceRequests,
  resourceViewer,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const today = dayMonthFormatter.format(new Date());
  const mealPlan = await mealPlanPdf();
  const recipes = recipesDoc();
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signInAsCoach();
  await resourceRequests.add(client.clientId, mealPlan, MEAL_PLAN);
  await resourceRequests.add(client.clientId, recipes, RECIPES);
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();
  const pageProblems = collectPageProblems(page);

  // act
  await clientDashboard.open();

  // assert
  await clientPortalShell.expectSidebarResources("marked");

  // act
  await clientPortalShell.openResourcesFromSidebar();

  // assert
  await clientResources.expectOpen();
  await clientPortalShell.expectResourcesCurrent();
  await clientResources.expectCards([RECIPES.title, MEAL_PLAN.title]);
  await clientResources.expectNew(RECIPES_CARD);
  await clientResources.expectNew(MEAL_PLAN_CARD);
  await clientResources.expectCover(RECIPES.title);
  await clientResources.expectThumbnail(MEAL_PLAN.title);
  await clientResources.expectNoManagementControls();

  // act
  await clientResources.openResourceWithKeyboard(MEAL_PLAN.title);

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 1,
    count: 3,
  });
  await resourceViewer.expectAtFirstPage();
  await resourceViewer.expectDetails({
    description: MEAL_PLAN.description,
    type: "PDF document",
    pages: 3,
    size: readableSizeOf(mealPlan),
    added: today,
  });
  await resourceViewer.expectDownloadOf("meal-plan-week-1.pdf");
  await clientResources.expectNoManagementControls();

  // act
  await resourceViewer.next();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 2,
    count: 3,
  });
  await resourceViewer.expectAnnounced({ page: 2, count: 3 });

  // act
  await resourceViewer.nextWithKey();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 3,
    count: 3,
  });
  await resourceViewer.expectAtLastPage();

  // act
  await resourceViewer.previousWithKey();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 2,
    count: 3,
  });

  // act
  await resourceViewer.previous();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 1,
    count: 3,
  });

  // act
  await resourceViewer.toggleZoom();

  // assert
  await resourceViewer.expectZoomed();

  // act
  await resourceViewer.toggleZoom();

  // assert
  await resourceViewer.expectFitted();

  // act
  const mealPlanDownload = await resourceViewer.download();

  // assert
  expect(mealPlanDownload.fileName).toBe("meal-plan-week-1.pdf");
  expect(mealPlanDownload.bytes.equals(mealPlan.buffer)).toBe(true);

  // act
  await resourceViewer.close();

  // assert
  await resourceViewer.expectClosed();
  await clientResources.expectFocusOn(MEAL_PLAN.title);
  await clientResources.expectNotNew(MEAL_PLAN_CARD);
  await clientResources.expectNew(RECIPES_CARD);
  await clientPortalShell.expectSidebarResources("marked");

  // act
  await clientResources.openResource(RECIPES.title);

  // assert
  await resourceViewer.expectCover(RECIPES.title, "recipes.doc");
  await resourceViewer.expectDetails({
    description: RECIPES.description,
    type: "Word document",
    size: readableSizeOf(recipes),
    added: today,
  });

  // act
  const recipesDownload = await resourceViewer.download();

  // assert
  expect(recipesDownload.fileName).toBe("recipes.doc");
  expect(recipesDownload.bytes.equals(recipes.buffer)).toBe(true);

  // act
  await resourceViewer.closeWithEscape();

  // assert
  await resourceViewer.expectClosed();
  await clientResources.expectFocusOn(RECIPES.title);
  await clientResources.expectNotNew(RECIPES_CARD);
  await clientResources.expectNotNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectSidebarResources("unmarked");

  // act
  await clientResources.reload();

  // assert
  await clientResources.expectCards([RECIPES.title, MEAL_PLAN.title]);
  await clientResources.expectNotNew(RECIPES_CARD);
  await clientResources.expectNotNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectSidebarResources("unmarked");
  await clientResources.expectNoManagementControls();
  expect(pageProblems).toEqual([]);
});

test("on her phone a client reaches her resources from the marked More tab, reads them full screen, and the marks clear", async ({
  clientDashboard,
  clientPortalShell,
  clientResources,
  page,
  provisionCoach,
  provisionSubmittedClient,
  publicNav,
  resourceRequests,
  resourceViewer,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signInAsCoach();
  await resourceRequests.add(client.clientId, await mealPlanPdf(), MEAL_PLAN);
  await resourceRequests.add(client.clientId, recipesDoc(), RECIPES);
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();
  await setPhoneViewport(page);

  // act
  await clientDashboard.open();

  // assert
  await clientPortalShell.expectMoreButton("marked");

  // act
  await clientPortalShell.openMore();

  // assert
  await clientPortalShell.expectSheetResources("marked");

  // act
  await clientPortalShell.openResourcesFromOpenMoreSheet();

  // assert
  await clientResources.expectOpen();
  await clientResources.expectCards([RECIPES.title, MEAL_PLAN.title]);
  await clientResources.expectColumns(2);
  await expectNoHorizontalScroll(page);

  // act
  await clientResources.openResource(MEAL_PLAN.title);

  // assert
  await resourceViewer.expectFullScreen();
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 1,
    count: 3,
  });
  await resourceViewer.expectDownloadInView();

  // act
  await resourceViewer.swipeToNext();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 2,
    count: 3,
  });
  await resourceViewer.expectAnnounced({ page: 2, count: 3 });

  // act
  await resourceViewer.close();

  // assert
  await clientResources.expectNotNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectMoreButton("marked");

  // act
  await clientResources.openResource(RECIPES.title);

  // assert
  await resourceViewer.expectFullScreen();
  await resourceViewer.expectCover(RECIPES.title, "recipes.doc");
  await resourceViewer.expectDownloadInView();

  // act
  await resourceViewer.close();

  // assert
  await clientResources.expectNotNew(RECIPES_CARD);
  await clientPortalShell.expectMoreButton("unmarked");

  // act
  await clientPortalShell.openMore();

  // assert
  await clientPortalShell.expectSheetResources("unmarked");
});

test("only she and her coach reach her resources: another client, a visitor and the coach are each refused what is not theirs", async ({
  clientResources,
  coachClientResources,
  page,
  provisionCoach,
  provisionOtherMeasuredClient,
  provisionSubmittedClient,
  publicNav,
  resourceRequests,
  resourceViewer,
  signIn,
  signInAsCoach,
  signInAsOtherClient,
  visitorResourceRequests,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const mealPlan = await mealPlanPdf();
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await provisionOtherMeasuredClient(NO_OTHER_MEASUREMENTS);
  await page.goto("/store");
  await signInAsCoach();
  const resourceId = await resourceRequests.add(
    client.clientId,
    mealPlan,
    MEAL_PLAN,
  );

  // act
  const coachMarking = await resourceRequests.markOpened(resourceId);

  // assert
  expect(coachMarking).toBe(403);

  // arrange
  await page.goto("/");
  await publicNav.signOut();

  // act
  const visitorStatuses =
    await visitorResourceRequests.reachStatuses(resourceId);

  // assert
  expect(visitorStatuses).toEqual([401, 401, 401, 401]);

  // arrange
  await page.goto("/store");
  await signIn();

  // act
  const clientReads = [
    await resourceRequests.openPage(resourceId, 1),
    await resourceRequests.openThumbnail(resourceId),
    await resourceRequests.download(resourceId),
  ];
  const clientAdding = await resourceRequests.upload(
    client.clientId,
    mealPlan,
    MEAL_PLAN,
  );

  // assert
  expect(clientReads.map((read) => read.status)).toEqual([200, 200, 200]);
  expect(clientReads[2]?.headers).toMatchObject({
    "content-disposition":
      "attachment; filename=\"meal-plan-week-1.pdf\"; filename*=UTF-8''meal-plan-week-1.pdf",
    "content-type": "application/pdf",
  });
  expect(clientAdding).toBe(403);

  // act
  await clientResources.open();

  // assert
  await clientResources.expectCards([MEAL_PLAN.title]);
  await clientResources.expectNew(MEAL_PLAN_CARD);

  // act
  await clientResources.openResource(MEAL_PLAN.title);
  await resourceViewer.close();

  // assert
  await clientResources.expectNotNew(MEAL_PLAN_CARD);

  // act
  const repeatedMarking = await resourceRequests.markOpened(resourceId);

  // assert
  expect(repeatedMarking).toBe(200);

  // arrange
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signInAsOtherClient();

  // act
  await clientResources.open();

  // assert
  await clientResources.expectEmpty();

  // act
  const otherClientStatuses = await resourceRequests.reachStatuses(resourceId);

  // assert
  expect(otherClientStatuses).toEqual([404, 404, 404, 404]);

  // arrange
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signInAsCoach();

  // act
  await coachClientResources.open(client.clientId);

  // assert
  await coachClientResources.expectCards([MEAL_PLAN.title]);
  await coachClientResources.expectCard(MEAL_PLAN_CARD);
});

test("a paid client who has not sent her onboarding is sent to her welcome and reaches none of her resources", async ({
  clientOnboarding,
  clientResources,
  page,
  provisionCoach,
  provisionPaidClient,
  publicNav,
  resourceRequests,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionPaidClient("female");
  await page.goto("/store");
  await signInAsCoach();
  const resourceId = await resourceRequests.add(
    client.clientId,
    await mealPlanPdf(),
    MEAL_PLAN,
  );
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();

  // act
  await clientResources.open();

  // assert
  await expect(page).toHaveURL(/\/client\/welcome$/);
  await clientOnboarding.expectWelcomeHeading(client.firstName);

  // act
  const statuses = await resourceRequests.reachStatuses(resourceId);

  // assert
  expect(statuses).toEqual([404, 404, 404, 404]);
});

test("a client whose coaching has ended is sent to her ended page and reaches none of her resources", async ({
  clientEnded,
  clientResources,
  page,
  portalRequests,
  provisionCoach,
  provisionSubscribedClient,
  publicNav,
  resourceRequests,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubscribedClient({
    start: "waiting",
    daysSincePayment: 3,
  });
  await page.goto("/store");
  await signInAsCoach();
  const resourceId = await resourceRequests.add(
    client.clientId,
    await mealPlanPdf(),
    MEAL_PLAN,
  );
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();
  await portalRequests.cancelSubscription();

  // act
  await clientResources.open();

  // assert
  await clientEnded.expectOpen();

  // act
  const statuses = await resourceRequests.reachStatuses(resourceId);

  // assert
  expect(statuses).toEqual([404, 404, 404, 404]);
});

test("a client with nothing yet is told so, and when her resources cannot be loaded her portal still opens and a retry shows them", async ({
  clientDashboard,
  clientPortalShell,
  clientResources,
  clientResourcesOutage,
  page,
  provisionCoach,
  provisionSubmittedClient,
  publicNav,
  resourceRequests,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signIn();

  // act
  await clientResources.open();

  // assert
  await clientResources.expectEmpty();
  await clientPortalShell.expectSidebarResources("unmarked");

  // arrange
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signInAsCoach();
  await resourceRequests.add(client.clientId, await mealPlanPdf(), MEAL_PLAN);
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();
  await clientDashboard.open();
  await clientResourcesOutage.begin();

  // act
  await clientResources.open();

  // assert
  await clientResources.expectUnavailable();
  await clientPortalShell.expectSidebarResources("unmarked");

  // act
  await clientResourcesOutage.end();
  await clientResources.retry();

  // assert
  await clientResources.expectOpen();
  await clientResources.expectCards([MEAL_PLAN.title]);
  await clientResources.expectNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectSidebarResources("marked");
});

test("when her opening cannot be recorded she still pages and downloads, the resource stays new, and the next opening clears it", async ({
  clientPortalShell,
  clientResources,
  page,
  provisionCoach,
  provisionSubmittedClient,
  publicNav,
  resourceRequests,
  resourceViewer,
  signIn,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const mealPlan = await mealPlanPdf();
  await provisionCoach();
  const client = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signInAsCoach();
  await resourceRequests.add(client.clientId, mealPlan, MEAL_PLAN);
  await page.goto("/");
  await publicNav.signOut();
  await page.goto("/store");
  await signIn();
  await clientResources.open();
  await clientResources.failNextOpening();

  // act
  await clientResources.openResource(MEAL_PLAN.title);
  await resourceViewer.next();

  // assert
  await resourceViewer.expectShowing({
    title: MEAL_PLAN.title,
    page: 2,
    count: 3,
  });

  // act
  const download = await resourceViewer.download();

  // assert
  expect(download.fileName).toBe("meal-plan-week-1.pdf");
  expect(download.bytes.equals(mealPlan.buffer)).toBe(true);

  // act
  await resourceViewer.close();

  // assert
  await resourceViewer.expectClosed();
  await clientResources.expectFocusOn(MEAL_PLAN.title);
  await clientResources.expectNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectSidebarResources("marked");

  // act
  await clientResources.openResource(MEAL_PLAN.title);
  await resourceViewer.close();

  // assert
  await clientResources.expectNotNew(MEAL_PLAN_CARD);
  await clientPortalShell.expectSidebarResources("unmarked");
});
