import { storedResourceIdsOf } from "../support/client-resource-files";
import { expect, test } from "../support/fixtures";
import {
  groceryListDocxNamedDoc,
  lockedPdf,
  mealPlanPdf,
  mealPlanPdfNamedHtml,
  overlongPdf,
  oversizedPdf,
  postureGuideImage,
  recipesDoc,
  renamedTextFile,
  trainingBlockPdf,
  type SampleResource,
} from "../support/sample-resources";
import { setPhoneViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 240_000;

const UNKNOWN_CLIENT_ID = "00000000-0000-4000-8000-000000000000";

const MEAL_PLAN = {
  title: "Week one meals",
  description: "Breakfasts and dinners for the first week.",
};

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

const KILOBYTE = 1024;

function readableSizeOf({ buffer }: SampleResource): string {
  return buffer.byteLength < KILOBYTE
    ? `${buffer.byteLength} B`
    : `${Math.round(buffer.byteLength / KILOBYTE)} KB`;
}

test("the coach reaches a client's resources from her record, keeps her entries through every refusal, and opens, pages and downloads what she added", async ({
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
  await coachClientResources.expectCard({ title: "Grocery list", type: "DOC" });
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
});

test("only the coach opens a client's resources: a signed-out visitor and the client herself are refused the page, its page images and the download", async ({
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
    await visitorResourceRequests.upload(client.clientId, mealPlan, MEAL_PLAN),
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
  const clientStatuses = [
    (await resourceRequests.openPage(resourceId, 1)).status,
    (await resourceRequests.openThumbnail(resourceId)).status,
    (await resourceRequests.download(resourceId)).status,
    await resourceRequests.upload(client.clientId, mealPlan, MEAL_PLAN),
  ];

  // assert
  expect(clientStatuses).toEqual([403, 403, 403, 403]);
  expect(storedResourceIdsOf(client.clientId)).toEqual([resourceId]);
});

test("on a phone the coach adds a resource from a bottom sheet and pages through it full screen", async ({
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
});
