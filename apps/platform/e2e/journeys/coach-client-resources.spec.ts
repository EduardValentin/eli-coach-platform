import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_FILE_BYTES,
  MAX_RESOURCE_TITLE_LENGTH,
} from "@eli-coach-platform/domain/client-resources";

import { storedResourceIdsOf } from "../support/client-resource-files";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  groceryListDocxNamedDoc,
  habitNotesOdt,
  japaneseMenuPdf,
  lockedPdf,
  macroSheetOds,
  mealPlanPdf,
  mealPlanPdfNamedHtml,
  overlongPdf,
  oversizedPdf,
  pdfOfExactLength,
  postureGuideImage,
  readableSizeOf,
  recipesDoc,
  renamedTextFile,
  stretchingPhotoWebp,
  trainingBlockPdf,
  weeklyTrackerXlsx,
} from "../support/sample-resources";
import { DARK_INK, darkestGreyOf } from "../support/served-page-images";
import { setPhoneViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 240_000;

const UNKNOWN_CLIENT_ID = "00000000-0000-4000-8000-000000000000";

const MEAL_PLAN = {
  title: "Week one meals",
  description: "Breakfasts and dinners for the first week.",
};

const RECIPES = {
  title: "Recipes",
  description: "Dinners for the weekend.",
};

const CORRECTED_RECIPES = {
  title: "Weekend recipes",
  description: "Three dinners for Saturday and Sunday.",
};

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

test(
  "the coach reaches a client's resources from her record, keeps her entries through every refusal, and opens, pages and downloads what she added",
  { tag: "@critical" },
  async ({
    addResourceDialog,
    coachClient,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceViewer,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const today = dayMonthFormatter.format(new Date());
    const mealPlan = await mealPlanPdf();
    const postureGuide = postureGuideImage();
    const groceryList = await groceryListDocxNamedDoc();
    const recipes = recipesDoc();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    const otherClient = await provisionClientInState("awaiting-review");
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClientResources.open(UNKNOWN_CLIENT_ID);

    // assert
    await coachClientResources.expectClientNotFound();

    // act
    await coachClient.open(client.clientId);
    await coachClient.openResources();

    // assert
    await coachClientResources.expectOpenFor(client);
    await coachClientResources.expectEmpty(client.firstName);

    // act
    await coachClientResources.goBack(client.fullName);

    // assert
    await coachClient.expectOpen(client.clientId);

    // act
    await coachClient.openResources();
    await coachClientResources.openAdd();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectRefusal("Choose a file to add.");

    // act
    await addResourceDialog.drop(await trainingBlockPdf());

    // assert
    await addResourceDialog.expectChosen("training_block.pdf");
    await addResourceDialog.expectTitle("Training block");

    // act
    await addResourceDialog.replace(mealPlan);

    // assert
    await addResourceDialog.expectChosen("meal-plan-week-1.pdf");
    await addResourceDialog.expectTitle("Meal plan week 1");

    // act
    await addResourceDialog.fill(MEAL_PLAN);
    await addResourceDialog.replace(renamedTextFile());

    // assert
    await addResourceDialog.expectChosen("shopping-notes.pdf");
    await addResourceDialog.expectEntries(MEAL_PLAN);

    // act
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectRefusal("That file type can’t be added.");
    await addResourceDialog.expectEntries(MEAL_PLAN);

    // act
    await addResourceDialog.replace(oversizedPdf());

    // assert
    await addResourceDialog.expectRefusal("That file is over 25 MB.");
    await addResourceDialog.expectEntries(MEAL_PLAN);

    // act
    await addResourceDialog.replace(await overlongPdf());
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectRefusal("That PDF has more than 50 pages.");
    await addResourceDialog.expectEntries(MEAL_PLAN);

    // act
    await addResourceDialog.replace(await lockedPdf());
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectRefusal(
      "That PDF can’t be opened. It may be damaged or password protected.",
    );
    await addResourceDialog.expectEntries(MEAL_PLAN);

    // act
    await addResourceDialog.replace(mealPlan);
    await addResourceDialog.clearTitle();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectTitleRequired();
    await addResourceDialog.expectChosen("meal-plan-week-1.pdf");

    // act
    await addResourceDialog.fill(MEAL_PLAN);
    await addResourceDialog.failNextUpload();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectFailed();
    await addResourceDialog.expectChosen("meal-plan-week-1.pdf");
    await addResourceDialog.expectEntries(MEAL_PLAN);
    expect(storedResourceIdsOf(client.clientId)).toEqual([]);

    // act
    const releaseUpload = await addResourceDialog.holdNextUpload();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectLockedWhileBusy();

    // act
    releaseUpload();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards([MEAL_PLAN.title]);
    await coachClientResources.expectCard({
      title: MEAL_PLAN.title,
      type: "PDF",
      pages: 3,
    });
    await coachClientResources.expectThumbnail(MEAL_PLAN.title);
    expect(storedResourceIdsOf(client.clientId)).toHaveLength(1);

    // act
    await coachClientResources.openResource(MEAL_PLAN.title);

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

    // act
    await resourceViewer.previousWithKey();

    // assert
    await resourceViewer.expectShowing({
      title: MEAL_PLAN.title,
      page: 1,
      count: 3,
    });

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
    await resourceViewer.expectAnnounced({ page: 3, count: 3 });
    await resourceViewer.expectAtLastPage();

    // act
    await resourceViewer.nextWithKey();

    // assert
    await resourceViewer.expectShowing({
      title: MEAL_PLAN.title,
      page: 3,
      count: 3,
    });

    // act
    await resourceViewer.previousWithKey();

    // assert
    await resourceViewer.expectShowing({
      title: MEAL_PLAN.title,
      page: 2,
      count: 3,
    });
    await resourceViewer.expectAnnounced({ page: 2, count: 3 });

    // act
    await resourceViewer.previous();

    // assert
    await resourceViewer.expectShowing({
      title: MEAL_PLAN.title,
      page: 1,
      count: 3,
    });
    await resourceViewer.expectAnnounced({ page: 1, count: 3 });

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
    await coachClientResources.expectFocusOn(MEAL_PLAN.title);

    // act
    await coachClientResources.openAdd();
    await addResourceDialog.choose(postureGuide);
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards(["Posture guide", MEAL_PLAN.title]);
    await coachClientResources.expectCard({
      title: "Posture guide",
      type: "IMG",
    });
    await coachClientResources.expectThumbnail("Posture guide");

    // act
    await coachClientResources.openResource("Posture guide");

    // assert
    await resourceViewer.expectShowing({
      title: "Posture guide",
      page: 1,
      count: 1,
    });
    await resourceViewer.expectNoPageControls();
    await resourceViewer.expectDetails({
      type: "Image",
      size: readableSizeOf(postureGuide),
      added: today,
    });

    // act
    await resourceViewer.closeWithEscape();

    // assert
    await resourceViewer.expectClosed();
    await coachClientResources.expectFocusOn("Posture guide");

    // act
    await coachClientResources.openAdd();
    await addResourceDialog.choose(groceryList);
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCard({
      title: "Grocery list",
      type: "DOC",
    });
    await coachClientResources.expectCover("Grocery list");

    // act
    await coachClientResources.openResource("Grocery list");

    // assert
    await resourceViewer.expectCover("Grocery list", "grocery-list.docx");
    await resourceViewer.expectDetails({
      type: "Word document",
      size: readableSizeOf(groceryList),
      added: today,
    });

    // act
    const groceryListDownload = await resourceViewer.download();

    // assert
    expect(groceryListDownload.fileName).toBe("grocery-list.docx");
    expect(groceryListDownload.bytes.equals(groceryList.buffer)).toBe(true);

    // act
    await resourceViewer.close();
    await coachClientResources.openAddWithKeyboard();
    await addResourceDialog.chooseWithKeyboard(recipes);
    await addResourceDialog.describeWithKeyboard(
      "Family recipes for the weekend.",
    );
    await addResourceDialog.submitWithKeyboard();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectAddFocused();
    await coachClientResources.expectCards([
      "Recipes",
      "Grocery list",
      "Posture guide",
      MEAL_PLAN.title,
    ]);
    await coachClientResources.expectCard({ title: "Recipes", type: "DOC" });

    // act
    await coachClientResources.openResourceWithKeyboard("Recipes");

    // assert
    await resourceViewer.expectCover("Recipes", "recipes.doc");
    await resourceViewer.expectDetails({
      description: "Family recipes for the weekend.",
      type: "Word document",
      size: readableSizeOf(recipes),
      added: today,
    });

    // act
    await resourceViewer.closeWithEscape();

    // assert
    await resourceViewer.expectClosed();
    await coachClientResources.expectFocusOn("Recipes");
    expect(storedResourceIdsOf(client.clientId)).toHaveLength(4);

    // act
    await coachClientResources.open(otherClient.clientId);

    // assert
    await coachClientResources.expectOpenFor(otherClient);
    await coachClientResources.expectEmpty(otherClient.firstName);
    expect(storedResourceIdsOf(otherClient.clientId)).toEqual([]);
  },
);

test(
  "only the coach adds to a client's resources: a signed-out visitor is refused the page, its page images, the download and adding, and the client herself is refused the page and adding",
  { tag: "@completeness" },
  async ({
    accountPortal,
    coachClientResources,
    page,
    provisionCoach,
    provisionPaidClient,
    publicNav,
    resourceRequests,
    signIn,
    signInAsCoach,
    visitorResourceRequests,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const mealPlan = await mealPlanPdfNamedHtml();
    await provisionCoach();
    const client = await provisionPaidClient("female");
    await page.goto("/store");
    await signInAsCoach();
    const resourceId = await resourceRequests.add(
      client.clientId,
      mealPlan,
      MEAL_PLAN,
    );

    // act
    const coachReads = [
      await resourceRequests.openPage(resourceId, 1),
      await resourceRequests.openThumbnail(resourceId),
      await resourceRequests.download(resourceId),
    ];

    // assert
    expect(coachReads.map((read) => read.status)).toEqual([200, 200, 200]);
    expect(coachReads[0]?.headers).toMatchObject({
      "cache-control": "private, no-store",
      "content-type": "image/webp",
      "x-content-type-options": "nosniff",
    });
    expect(coachReads[2]?.headers).toMatchObject({
      "content-disposition":
        "attachment; filename=\"meal-plan.pdf\"; filename*=UTF-8''meal-plan.pdf",
      "content-type": "application/pdf",
    });

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act
    const visitorStatuses = [
      (await visitorResourceRequests.openPage(resourceId, 1)).status,
      (await visitorResourceRequests.openThumbnail(resourceId)).status,
      (await visitorResourceRequests.download(resourceId)).status,
      await visitorResourceRequests.upload(
        client.clientId,
        mealPlan,
        MEAL_PLAN,
      ),
    ];

    // assert
    expect(visitorStatuses).toEqual([401, 401, 401, 401]);

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await accountPortal.expectEmailStepVisible();

    // arrange
    await page.goto("/store");
    await signIn();

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await coachClientResources.expectRefused();

    // act
    const clientAdding = await resourceRequests.upload(
      client.clientId,
      mealPlan,
      MEAL_PLAN,
    );

    // assert
    expect(clientAdding).toBe(403);
    expect(storedResourceIdsOf(client.clientId)).toEqual([resourceId]);
  },
);

test(
  "on a phone the coach adds a resource from a bottom sheet and pages through it full screen",
  { tag: "@completeness" },
  async ({
    addResourceDialog,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceViewer,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const mealPlan = await mealPlanPdf();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await setPhoneViewport(page);

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await coachClientResources.expectOpenFor(client);
    await coachClientResources.expectEmpty(client.firstName);

    // act
    await coachClientResources.openAdd();

    // assert
    await addResourceDialog.expectBottomSheet();

    // act
    await addResourceDialog.choose(mealPlan);
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards(["Meal plan week 1"]);
    await coachClientResources.expectThumbnail("Meal plan week 1");

    // act
    await coachClientResources.openResource("Meal plan week 1");

    // assert
    await resourceViewer.expectFullScreen();
    await resourceViewer.expectShowing({
      title: "Meal plan week 1",
      page: 1,
      count: 3,
    });

    // act
    await resourceViewer.swipeToNext();

    // assert
    await resourceViewer.expectShowing({
      title: "Meal plan week 1",
      page: 2,
      count: 3,
    });
    await resourceViewer.expectAnnounced({ page: 2, count: 3 });

    // act
    await resourceViewer.next();

    // assert
    await resourceViewer.expectShowing({
      title: "Meal plan week 1",
      page: 3,
      count: 3,
    });

    // act
    await resourceViewer.close();

    // assert
    await resourceViewer.expectClosed();
    await coachClientResources.expectFocusOn("Meal plan week 1");
  },
);

test(
  "the coach adds a spreadsheet, OpenDocument files, a dropped photo and a file of exactly 25 MB, and the console stays clean",
  { tag: "@completeness" },
  async ({
    addResourceDialog,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceViewer,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS * 2);

    // arrange
    const today = dayMonthFormatter.format(new Date());
    const tracker = await weeklyTrackerXlsx();
    const habits = await habitNotesOdt();
    const macros = await macroSheetOds();
    const stretching = await stretchingPhotoWebp();
    const atLimit = await pdfOfExactLength(
      "at-the-limit.pdf",
      MAX_RESOURCE_FILE_BYTES,
    );
    const overLimit = await pdfOfExactLength(
      "over-the-limit.pdf",
      MAX_RESOURCE_FILE_BYTES + 1,
    );
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    const pageProblems = collectPageProblems(page);
    await coachClientResources.open(client.clientId);

    for (const [sample, title, cardType, detailType] of [
      [tracker, "Weekly tracker", "XLS", "Spreadsheet"],
      [habits, "Habit notes", "DOC", "Word document"],
      [macros, "Macro sheet", "XLS", "Spreadsheet"],
    ] as const) {
      // act
      await coachClientResources.openAdd();
      await addResourceDialog.choose(sample);

      // assert
      await addResourceDialog.expectTitle(title);

      // act
      await addResourceDialog.submit();

      // assert
      await addResourceDialog.expectAdded();
      await coachClientResources.expectCard({ title, type: cardType });
      await coachClientResources.expectCover(title);

      // act
      await coachClientResources.openResource(title);

      // assert
      await resourceViewer.expectCover(title, sample.name);
      await resourceViewer.expectDetails({
        type: detailType,
        size: readableSizeOf(sample),
        added: today,
      });

      // act
      const downloaded = await resourceViewer.download();

      // assert
      expect(downloaded.fileName).toBe(sample.name);
      expect(downloaded.bytes.equals(sample.buffer)).toBe(true);

      // act
      await resourceViewer.close();

      // assert
      await coachClientResources.expectFocusOn(title);
    }

    // act
    await coachClientResources.openAdd();
    await addResourceDialog.drop(stretching);

    // assert
    await addResourceDialog.expectChosen("stretching-routine.webp");
    await addResourceDialog.expectTitle("Stretching routine");

    // act
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCard({
      title: "Stretching routine",
      type: "IMG",
    });
    await coachClientResources.expectThumbnail("Stretching routine");

    // act
    await coachClientResources.openResource("Stretching routine");

    // assert
    await resourceViewer.expectShowing({
      title: "Stretching routine",
      page: 1,
      count: 1,
    });
    await resourceViewer.expectNoPageControls();

    // act
    await resourceViewer.closeWithEscape();
    await coachClientResources.openAdd();
    await addResourceDialog.choose(overLimit);

    // assert
    await addResourceDialog.expectRefusal("That file is over 25 MB.");

    // act
    await addResourceDialog.choose(atLimit);
    const releaseUpload = await addResourceDialog.holdNextUpload();
    await addResourceDialog.submit();

    // assert
    await addResourceDialog.expectLockedWhileBusy();
    await addResourceDialog.expectOutsideClickIgnored();

    // act
    releaseUpload();

    // assert
    await addResourceDialog.expectAdded();
    await coachClientResources.expectCards([
      "At the limit",
      "Stretching routine",
      "Macro sheet",
      "Habit notes",
      "Weekly tracker",
    ]);
    await coachClientResources.expectCard({
      title: "At the limit",
      type: "PDF",
    });

    // act
    await coachClientResources.openResource("At the limit");

    // assert
    await resourceViewer.expectShowing({
      title: "At the limit",
      page: 1,
      count: 1,
    });
    await resourceViewer.expectDetails({
      type: "PDF document",
      pages: 1,
      size: "25.0 MB",
      added: today,
    });

    // act
    const atLimitDownload = await resourceViewer.download();

    // assert
    expect(atLimitDownload.fileName).toBe("at-the-limit.pdf");
    expect(atLimitDownload.bytes.equals(atLimit.buffer)).toBe(true);
    expect(pageProblems).toEqual([]);
  },
);

test(
  "the add route keeps a 120-character title and a 2,000-character description and refuses one more of either",
  { tag: "@completeness" },
  async ({
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const mealPlan = await mealPlanPdf();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();

    // act
    const titleAtLimit = await resourceRequests.uploadAnswer(
      client.clientId,
      mealPlan,
      {
        title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH),
        description: "",
      },
    );
    const titleOverLimit = await resourceRequests.uploadAnswer(
      client.clientId,
      mealPlan,
      { title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH + 1), description: "" },
    );
    const descriptionAtLimit = await resourceRequests.uploadAnswer(
      client.clientId,
      mealPlan,
      {
        title: "Long description",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH),
      },
    );
    const descriptionOverLimit = await resourceRequests.uploadAnswer(
      client.clientId,
      mealPlan,
      {
        title: "Longer description",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
      },
    );

    // assert
    expect(titleAtLimit.status).toBe(201);
    expect(titleOverLimit).toEqual({
      status: 400,
      body: { problems: { title: "too-long" } },
    });
    expect(descriptionAtLimit.status).toBe(201);
    expect(descriptionOverLimit).toEqual({
      status: 400,
      body: { problems: { description: "too-long" } },
    });
  },
);

test(
  "a PDF's Japanese text renders on its page image",
  { tag: "@completeness" },
  async ({
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    const japaneseMenuId = await resourceRequests.add(
      client.clientId,
      japaneseMenuPdf(),
      { title: "Japanese menu", description: "" },
    );

    // act
    const japanesePage = await resourceRequests.pageImageBytes(
      japaneseMenuId,
      1,
    );

    // assert
    expect(await darkestGreyOf(japanesePage)).toBeLessThan(DARK_INK);
  },
);

test(
  "when a client's resources cannot be loaded the coach is told, keeps her way back, and a retry shows them",
  { tag: "@completeness" },
  async ({
    clientResourcesOutage,
    coachClient,
    coachClientResources,
    page,
    provisionClientInState,
    provisionCoach,
    resourceRequests,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await resourceRequests.add(client.clientId, await mealPlanPdf(), MEAL_PLAN);
    await coachClient.open(client.clientId);
    await clientResourcesOutage.begin();

    // act
    await coachClient.openResources();

    // assert
    await coachClientResources.expectUnavailable(client.fullName);

    // act
    await coachClientResources.open(client.clientId);

    // assert
    await coachClientResources.expectUnavailable(client.fullName);

    // act
    await clientResourcesOutage.end();
    await coachClientResources.retry();

    // assert
    await coachClientResources.expectCards([MEAL_PLAN.title]);
  },
);

test(
  "the coach corrects a resource from its card, deletes another from the viewer, and the client finds only what is left, while the client can neither change nor delete",
  { tag: "@completeness" },
  async ({
    clientResources,
    coachClientResources,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    resourceDetailsDialog,
    resourceRequests,
    resourceViewer,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    const today = dayMonthFormatter.format(new Date());
    const recipes = recipesDoc();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    const mealPlanId = await resourceRequests.add(
      client.clientId,
      await mealPlanPdf(),
      MEAL_PLAN,
    );
    const recipesId = await resourceRequests.add(
      client.clientId,
      recipes,
      RECIPES,
    );
    await coachClientResources.open(client.clientId);

    // act
    await coachClientResources.chooseAction(RECIPES.title, "Edit details");
    await resourceDetailsDialog.fill(CORRECTED_RECIPES);
    await resourceDetailsDialog.save();

    // assert
    await resourceDetailsDialog.expectClosed();
    await coachClientResources.expectToast("Changes saved.");
    await coachClientResources.expectCards([
      CORRECTED_RECIPES.title,
      MEAL_PLAN.title,
    ]);

    // act
    await coachClientResources.openResource(CORRECTED_RECIPES.title);

    // assert
    await resourceViewer.expectCover(CORRECTED_RECIPES.title, "recipes.doc");
    await resourceViewer.expectDetails({
      description: CORRECTED_RECIPES.description,
      type: "Word document",
      size: readableSizeOf(recipes),
      added: today,
    });

    // act
    await resourceViewer.close();
    await coachClientResources.openResource(MEAL_PLAN.title);
    const deletion = await resourceViewer.delete(MEAL_PLAN.title);

    // assert
    await deletion.expectOpen(`It’s removed for you and ${client.firstName}.`);

    // act
    await deletion.confirm();

    // assert
    await deletion.expectClosed();
    await resourceViewer.expectClosed();
    await coachClientResources.expectToast("Resource deleted.");
    await coachClientResources.expectCards([CORRECTED_RECIPES.title]);
    expect(await resourceRequests.fileStatuses(mealPlanId)).toEqual([
      404, 404, 404,
    ]);
    expect(storedResourceIdsOf(client.clientId)).toEqual([recipesId]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientResources.open();

    // assert
    await clientResources.expectCards([CORRECTED_RECIPES.title]);

    // act
    const deletedReads = await resourceRequests.fileStatuses(mealPlanId);
    const clientChange = await resourceRequests.changeDetails(
      recipesId,
      RECIPES,
    );
    const clientRemoval = await resourceRequests.remove(recipesId);

    // assert
    expect(deletedReads).toEqual([404, 404, 404]);
    expect(clientChange).toBe(403);
    expect(clientRemoval).toBe(403);
    expect(storedResourceIdsOf(client.clientId)).toEqual([recipesId]);
  },
);
