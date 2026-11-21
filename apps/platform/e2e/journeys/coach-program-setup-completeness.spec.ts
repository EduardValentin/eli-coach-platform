import type { Page, TestInfo } from "@playwright/test";

import { expect, test } from "../support/fixtures";
import { recordAnswersApproved } from "../support/submitted-clients";
import { clearGoalOnProfile } from "../support/program-setup-arrangements";
import { expectOneH1AndNoSkippedLevels } from "../support/heading-outline";
import { expectLayoutFits } from "../support/layout-fit";
import { setDesktopViewport, setPhoneViewport } from "../support/viewport";
import type { ProgramSetupChoices } from "../support/program-setup-page";

const JOURNEY_TIMEOUT_MS = 300_000;

// The answer the create action gives when the store throws, as the app itself sends it.
const FAILED_CREATE_ANSWER = '[{"_1":2},"data",{"_3":4},"status","failed"]\n';

const PREFILLED_FROM_HER_PROFILE: ProgramSetupChoices = {
  goal: "Fat loss",
  level: "Beginner",
  trainingDays: "3 days",
  split: "Full Body",
  sessionLength: "60 min",
  dailySteps: "6,000",
  equipment: ["Full gym", "Dumbbells"],
  language: "English",
};

test.use({ trace: "on" });

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test(
  "a client whose answers are not approved has a Program card that waits and offers no action, the setup is not ready, and approving her answers offers Build program",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      page,
      programSetup,
      provisionCoach,
      provisionProfiledClient,
      provisionSubmittedClient,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    const maleClient = await provisionProfiledClient("manual-screening");
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectProgramWaitingOnApproval(client.gender);
    await attachScreenshot(page, testInfo, "card-waiting");

    // act
    await coachClient.open(maleClient.clientId);

    // assert
    await coachClient.expectProgramWaitingOnApproval(maleClient.gender);

    // act
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await programSetup.expectNotReady("her");
    await attachScreenshot(page, testInfo, "setup-not-ready");

    // act
    await coachClient.open(client.clientId);
    await coachClient.approveAnswers(client.firstName);

    // assert
    await coachClient.expectProgramReadyToBuild(client.gender);
    await attachScreenshot(page, testInfo, "card-ready-to-build");

    // act
    await coachClient.buildProgram();

    // assert
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectChoices(PREFILLED_FROM_HER_PROFILE);
  },
);

test(
  "the setup opens full screen with every question prefilled from her profile, the split follows the training days until the coach chooses one, and leaving asks only after a change",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    const clientName = `${client.firstName} ${client.lastName}`.trim();
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.buildProgram();

    // assert
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectFullScreenFor(clientName);
    await programSetup.expectEveryQuestionAsked();
    await programSetup.expectChoices(PREFILLED_FROM_HER_PROFILE);
    await attachScreenshot(page, testInfo, "setup-prefilled");

    // act
    await programSetup.clickBackToClient(clientName);

    // assert
    await coachClient.expectOpen(client.clientId);
    await programSetup.expectNoLeaveQuestion();

    // act
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.chooseTrainingDays("5+ days");

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "5+ days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.chooseTrainingDays("2 days");

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "2 days",
      split: "Full Body",
    });

    // act
    await programSetup.chooseSplit("Upper / Lower");
    await programSetup.chooseTrainingDays("3 days");

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "3 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.chooseTrainingDays("4 days");
    await programSetup.chooseTrainingDays("2 days");

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "2 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.clickCancel();

    // assert
    await programSetup.expectLeaveAsked();
    await programSetup.expectLeaveDialogTrapsFocus();
    await attachScreenshot(page, testInfo, "setup-leave-dialog");

    // act
    await programSetup.dismissLeaveWithEscape();

    // assert
    await programSetup.expectFocusBackOn("Cancel");
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "2 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.clickBackToClient(clientName);
    await programSetup.expectLeaveAsked();
    await programSetup.keepEditing();

    // assert
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "2 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.clickBackToClient(clientName);
    await programSetup.discard();

    // assert
    await coachClient.expectOpen(client.clientId);

    // act
    await coachClient.buildProgram();

    // assert
    await programSetup.expectChoices(PREFILLED_FROM_HER_PROFILE);
  },
);

const BEGINNER_BLOCKS = [
  { label: "Foundation · 4 wk", sessions: "0 of 3 sessions" },
  { label: "Hypertrophy · 6 wk", sessions: "0 of 3 sessions" },
  { label: "Deload · 1 wk", sessions: "0 of 3 sessions" },
];

test(
  "creating is refused while no goal is chosen or no equipment is selected, each problem is explained at its field, and her other choices stay",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await clearGoalOnProfile(databasePool, client.clientId);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectGoalUnchosen();

    // act
    await programSetup.create();

    // assert
    await programSetup.expectGoalProblem("Choose a goal.");
    await programSetup.expectProblemAnnounced("Choose a goal.");
    await programSetup.expectFocusOn("Goal");
    await programSetup.expectEquipmentChecked(["Full gym", "Dumbbells"]);
    await attachScreenshot(page, testInfo, "setup-goal-problem");

    // act
    await programSetup.clearEquipment(["Full gym", "Dumbbells"]);
    await programSetup.chooseTrainingDays("4 days");
    await programSetup.chooseFromSelect("Level", "Intermediate");
    await programSetup.create();

    // assert
    await programSetup.expectGoalProblem("Choose a goal.");
    await programSetup.expectEquipmentProblem(
      "Choose at least one equipment option.",
    );
    await programSetup.expectProblemAnnounced(
      "Choose at least one equipment option.",
    );
    await programSetup.expectEquipmentChecked([]);
    await attachScreenshot(page, testInfo, "setup-both-problems");

    // act
    await programSetup.chooseFromSelect("Goal", "Muscle gain");
    await programSetup.create();

    // assert
    await programSetup.expectEquipmentProblem(
      "Choose at least one equipment option.",
    );
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      goal: "Muscle gain",
      level: "Intermediate",
      trainingDays: "4 days",
      split: "Upper / Lower",
      equipment: [],
    });

    // act
    await programSetup.toggleEquipment("Barbell");
    await programSetup.create();

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: [
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
        { label: "Deload · 1 wk", sessions: "0 of 4 sessions" },
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
      ],
      stillMissing: ["12 sessions without exercises"],
    });
  },
);

test(
  "creating shows Creating… and allows no second submit, returns to her page with the beginner draft, shows the changed equipment on her profile, and a second setup leads back to her page",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      coachClientProfile,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    const created: string[] = [];
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    page.on("request", (request) => {
      if (request.method() === "POST") created.push(request.url());
    });
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await page.route(
      new RegExp(`/coach/clients/${client.clientId}/program/new`),
      async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await held;
        return route.continue();
      },
    );
    await programSetup.toggleEquipment("Kettlebells");
    await programSetup.toggleEquipment("Dumbbells");
    await programSetup.expectEquipmentChecked(["Full gym", "Kettlebells"]);

    // act
    await programSetup.create();

    // assert
    await programSetup.expectCreating();
    await attachScreenshot(page, testInfo, "setup-creating");

    // act
    await programSetup.forceSecondSubmit();
    release();

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: BEGINNER_BLOCKS,
      stillMissing: ["9 sessions without exercises"],
    });
    expect(
      created.filter((url) => url.includes(`${client.clientId}/program/new`)),
    ).toHaveLength(1);
    await attachScreenshot(page, testInfo, "card-draft");

    // act
    await coachClientProfile.open(client.clientId);

    // assert
    await coachClientProfile.coaching.expectTicked(["Full gym", "Kettlebells"]);
    await coachClientProfile.coaching.expectUnticked(["Dumbbells"]);

    // act
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await coachClient.expectOpen(client.clientId);
    await expectOneH1AndNoSkippedLevels(page);
  },
);

test(
  "a failed save tells the coach, keeps her choices, and the next try creates the program",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    let refused = false;
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await page.route(
      new RegExp(`/coach/clients/${client.clientId}/program/new`),
      async (route) => {
        if (route.request().method() !== "POST" || refused) {
          return route.fallback();
        }
        refused = true;
        return route.fulfill({
          status: 200,
          headers: {
            "x-remix-response": "yes",
            "content-type": "text/x-script",
          },
          body: FAILED_CREATE_ANSWER,
        });
      },
    );
    await programSetup.chooseTrainingDays("4 days");
    await programSetup.chooseSessionLength("45 min");
    await programSetup.toggleEquipment("Barbell");

    // act
    await programSetup.create();

    // assert
    await programSetup.expectSaveFailedNotice();
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "4 days",
      split: "Upper / Lower",
      sessionLength: "45 min",
      equipment: ["Full gym", "Dumbbells", "Barbell"],
    });
    await programSetup.expectCreateOffered();
    await attachScreenshot(page, testInfo, "setup-save-failed");

    // act
    await programSetup.create();

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: [
        { label: "Foundation · 4 wk", sessions: "0 of 4 sessions" },
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
        { label: "Deload · 1 wk", sessions: "0 of 4 sessions" },
      ],
      stillMissing: ["12 sessions without exercises"],
    });
  },
);

test(
  "a failed create request leaves the coach on the setup with her choices and a notice",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    let dropped = false;
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await page.route(
      new RegExp(`/coach/clients/${client.clientId}/program/new`),
      async (route) => {
        if (route.request().method() !== "POST" || dropped) {
          return route.fallback();
        }
        dropped = true;
        return route.abort("failed");
      },
    );
    await programSetup.chooseTrainingDays("4 days");

    // act
    await programSetup.create();

    // assert
    await programSetup.expectSaveFailedNotice();
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      trainingDays: "4 days",
      split: "Upper / Lower",
    });
  },
);

const ENDED_BLOCKS = BEGINNER_BLOCKS;
const DAYS_INSIDE_WITHDRAWAL = 3;
const DAYS_PAST_WITHDRAWAL = 20;
const OK = 200;
const FORBIDDEN = 403;
const NOT_FOUND = 404;

test(
  "a client whose coaching has ended before her answers were approved has a Program card that says so with no action, and her setup leads back to her page",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      page,
      portalRequests,
      provisionCoach,
      provisionSubscribedClient,
      publicNav,
      signIn,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: DAYS_INSIDE_WITHDRAWAL,
    });
    await page.goto("/store");
    await signIn();
    expect((await portalRequests.cancelSubscription()).status).toBe(OK);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectProgramEndedWithoutDraft(client.gender);
    await attachScreenshot(page, testInfo, "card-ended-unapproved");

    // act
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectProgramEndedWithoutDraft(client.gender);
  },
);

test(
  "a client whose coaching has ended after her answers were approved has the same Program card with no action",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      portalRequests,
      provisionCoach,
      provisionSubscribedClient,
      publicNav,
      signIn,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: DAYS_INSIDE_WITHDRAWAL,
    });
    await recordAnswersApproved(databasePool, client);
    await page.goto("/store");
    await signIn();
    expect((await portalRequests.cancelSubscription()).status).toBe(OK);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectProgramEndedWithoutDraft(client.gender);
    await attachScreenshot(page, testInfo, "card-ended-approved");

    // act
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await coachClient.expectOpen(client.clientId);
  },
);

test(
  "a client who has cancelled but still has access is still offered Build program and the coach can create her draft",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      portalRequests,
      programSetup,
      provisionCoach,
      provisionSubscribedClient,
      publicNav,
      signIn,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: DAYS_PAST_WITHDRAWAL,
    });
    await recordAnswersApproved(databasePool, client);
    await page.goto("/store");
    await signIn();
    expect((await portalRequests.cancelSubscription()).status).toBe(OK);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectProgramReadyToBuild(client.gender);
    await attachScreenshot(page, testInfo, "card-cancelled-with-access");

    // act
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.create();

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: ENDED_BLOCKS,
      stillMissing: ["9 sessions without exercises"],
    });
  },
);

test(
  "a client whose coaching has ended after the coach made her draft has the draft's blocks on her card and says it can't be published, and a second setup leads back to her page",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      portalRequests,
      programSetup,
      provisionCoach,
      provisionSubscribedClient,
      publicNav,
      signIn,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: DAYS_INSIDE_WITHDRAWAL,
    });
    await recordAnswersApproved(databasePool, client);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.create();
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: ENDED_BLOCKS,
      stillMissing: ["9 sessions without exercises"],
    });
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    expect((await portalRequests.cancelSubscription()).status).toBe(OK);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectEndedDraftProgram(client.gender, {
      version: 1,
      blocks: ENDED_BLOCKS,
    });
    await attachScreenshot(page, testInfo, "card-draft-ended");

    // act
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectEndedDraftProgram(client.gender, {
      version: 1,
      blocks: ENDED_BLOCKS,
    });
  },
);

test(
  "a signed-out visitor and a signed-in client are refused on the setup address, and an unknown client id is not found",
  { tag: "@completeness" },
  async (
    {
      accountPortal,
      page,
      provisionAccount,
      provisionClientInState,
      provisionCoach,
      publicNav,
      signIn,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    await provisionAccount("CLIENT");
    const client = await provisionClientInState("approved");
    const setupPath = `/coach/clients/${client.clientId}/program/new`;

    // act
    await page.goto(setupPath);

    // assert
    await accountPortal.expectEmailStepVisible();

    // act
    await page.goto("/store");
    await signIn();
    const clientVisit = await page.goto(setupPath);

    // assert
    expect(clientVisit?.status()).toBe(FORBIDDEN);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Build .+’s program$/ }),
    ).toHaveCount(0);
    await attachScreenshot(page, testInfo, "setup-refused-for-client");

    // act
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const unknownVisit = await page.goto(
      "/coach/clients/00000000-0000-4000-8000-000000000000/program/new",
    );

    // assert
    expect(unknownVisit?.status()).toBe(NOT_FOUND);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Build .+’s program$/ }),
    ).toHaveCount(0);

    // act
    const malformedVisit = await page.goto(
      "/coach/clients/not-a-client/program/new",
    );

    // assert
    expect(malformedVisit?.status()).toBe(NOT_FOUND);
  },
);

test(
  "the whole setup is completed and submitted with the keyboard alone, the tab order follows the screen and the leave dialog traps focus and returns it",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    const clientName = `${client.firstName} ${client.lastName}`.trim();
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.expectChoices(PREFILLED_FROM_HER_PROFILE);

    // act
    await programSetup.expectTabOrderFollowsTheScreen(clientName);

    // act
    await page.getByRole("link", { name: `Back to ${clientName}` }).focus();
    await programSetup.chooseFromSelectWithKeyboard("Goal", "Muscle gain");
    await programSetup.chooseFromSelectWithKeyboard("Level", "Intermediate");
    await programSetup.stepChoiceWithKeyboard(
      "Training days",
      "ArrowRight",
      "4 days",
    );

    // assert
    await programSetup.expectChoices({
      ...PREFILLED_FROM_HER_PROFILE,
      goal: "Muscle gain",
      level: "Intermediate",
      trainingDays: "4 days",
      split: "Upper / Lower",
    });

    // act
    await programSetup.stepChoiceWithKeyboard(
      "Split",
      "ArrowLeft",
      "Full Body",
    );
    await programSetup.stepChoiceWithKeyboard(
      "Session length",
      "ArrowLeft",
      "45 min",
    );
    await programSetup.chooseFromSelectWithKeyboard("Daily steps", "8,000");
    await programSetup.toggleEquipmentWithKeyboard("Barbell");
    await programSetup.toggleEquipmentWithKeyboard("Dumbbells");

    // assert
    await programSetup.expectChoices({
      goal: "Muscle gain",
      level: "Intermediate",
      trainingDays: "4 days",
      split: "Full Body",
      sessionLength: "45 min",
      dailySteps: "8,000",
      equipment: ["Full gym", "Barbell"],
      language: "English",
    });

    // act
    await programSetup.openLeaveWithKeyboard();

    // assert
    await programSetup.expectLeaveDialogTrapsFocus();

    // act
    await programSetup.keepEditingWithKeyboard();

    // assert
    await programSetup.expectFocusBackOn("Cancel");

    // act
    await programSetup.createWithKeyboard();

    // assert
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: [
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
        { label: "Deload · 1 wk", sessions: "0 of 4 sessions" },
        { label: "Hypertrophy · 6 wk", sessions: "0 of 4 sessions" },
      ],
      stillMissing: ["12 sessions without exercises"],
    });
  },
);

test(
  "on both pages there is one h1 and no skipped heading level, and the setup ties its problems to their fields and exposes the saving and failed states",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await clearGoalOnProfile(databasePool, client.clientId);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // assert
    await expectOneH1AndNoSkippedLevels(page);

    // act
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.clearEquipment(["Full gym", "Dumbbells"]);
    await programSetup.create();

    // assert
    await programSetup.expectGoalProblem("Choose a goal.");
    await programSetup.expectEquipmentProblem(
      "Choose at least one equipment option.",
    );
    await programSetup.expectProblemAnnounced("Choose a goal.");
    await programSetup.expectProblemAnnounced(
      "Choose at least one equipment option.",
    );
    await expectOneH1AndNoSkippedLevels(page);
    await testInfo.attach("setup-accessibility-tree", {
      body: await page.getByRole("main").ariaSnapshot(),
      contentType: "text/plain",
    });

    // act
    await programSetup.chooseFromSelect("Goal", "Muscle gain");
    await programSetup.toggleEquipment("Barbell");
    await programSetup.create();

    // assert
    await coachClient.expectOpen(client.clientId);
    await expectOneH1AndNoSkippedLevels(page);
    await testInfo.attach("client-page-accessibility-tree", {
      body: await page.getByRole("region", { name: "Program" }).ariaSnapshot(),
      contentType: "text/plain",
    });
  },
);

test(
  "on a phone and on a desktop neither page scrolls sideways and nothing overlaps or is cut off",
  { tag: "@completeness" },
  async (
    {
      coachClient,
      databasePool,
      page,
      programSetup,
      provisionClientInState,
      provisionCoach,
      signInAsCoach,
    },
    testInfo,
  ) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await clearGoalOnProfile(databasePool, client.clientId);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.expectOpenFor(client.firstName, client.clientId);
    await programSetup.clearEquipment(["Full gym", "Dumbbells"]);
    await programSetup.create();
    await programSetup.expectGoalProblem("Choose a goal.");

    for (const [name, setViewport] of [
      ["phone", setPhoneViewport],
      ["desktop", setDesktopViewport],
    ] as const) {
      // act
      await setViewport(page);
      if (name === "desktop") {
        await page.setViewportSize({ width: 1280, height: 900 });
      }

      // assert
      await expectLayoutFits(page);
      await attachScreenshot(page, testInfo, `setup-problems-${name}`);
    }

    // act
    await programSetup.chooseFromSelect("Goal", "Muscle gain");
    await programSetup.toggleEquipment("Barbell");
    await programSetup.create();
    await coachClient.expectOpen(client.clientId);
    await coachClient.expectDraftProgram({
      version: 1,
      blocks: BEGINNER_BLOCKS,
      stillMissing: ["9 sessions without exercises"],
    });

    for (const [name, size] of [
      ["phone", { width: 390, height: 844 }],
      ["desktop", { width: 1280, height: 900 }],
    ] as const) {
      // act
      await page.setViewportSize(size);

      // assert
      await expectLayoutFits(
        page,
        page.getByRole("region", { name: "Program" }),
      );
      await attachScreenshot(page, testInfo, `client-card-${name}`);
    }
  },
);
