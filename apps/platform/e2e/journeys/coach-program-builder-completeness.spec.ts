import { expect, test } from "../support/fixtures";
import { expectOneH1AndNoSkippedLevels } from "../support/heading-outline";
import { expectLayoutFits } from "../support/layout-fit";
import { collectPageProblems } from "../support/page-problems";
import { setDesktopViewport, setPhoneViewport } from "../support/viewport";
import { ProgramBuilderPage } from "../support/program-builder-page";

const JOURNEY_TIMEOUT_MS = 300_000;

test.use({ trace: "on" });

test(
  "a save from an older copy is refused, the builder locks behind Reload, and Reload shows the newer draft",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    const elsewhere = new ProgramBuilderPage(await page.context().newPage());
    await elsewhere.open(client.clientId);
    await elsewhere.chooseLevel("Advanced");
    await elsewhere.expectSaved();

    // act
    await programBuilder.chooseLevel("Intermediate");

    // assert
    await programBuilder.expectChangedElsewhere();

    // act
    await programBuilder.pressEscape();

    // assert
    await programBuilder.expectChangedElsewhere();

    // act
    await programBuilder.reload();

    // assert
    await programBuilder.expectLevel("Advanced");
    await programBuilder.expectPlaceHeadingFocused("Overview");
  },
);

test(
  "a failed save keeps the change on screen, says so, and recovers on Try again now",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await programBuilder.failSaves();

    // act
    await programBuilder.chooseLevel("Advanced");

    // assert
    await programBuilder.expectFailedSave();
    await programBuilder.expectLevel("Advanced");

    // act
    await programBuilder.letSavesThrough();
    await programBuilder.tryAgainNow();

    // assert
    await programBuilder.expectRecovered("Overview");
    await programBuilder.expectAnnounced("All changes saved.");

    // act
    await page.reload();

    // assert
    await programBuilder.expectLevel("Advanced");
  },
);

test(
  "leaving after a failed save asks first, Keep editing stays, and Leave without saving goes back to her page",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await programBuilder.failSaves();
    await programBuilder.chooseLevel("Advanced");
    await programBuilder.expectFailedSave();

    // act
    await programBuilder.goBackToClient(client.fullName);

    // assert
    await programBuilder.expectLeaveWarning();

    // act
    await programBuilder.keepEditing(client.fullName);
    await programBuilder.goBackToClient(client.fullName);
    await programBuilder.leaveWithoutSaving();

    // assert
    await coachClient.expectOpen(client.clientId);
  },
);

test(
  "a client without a program is offered the setup, and a signed-out visitor is sent to sign in",
  { tag: "@completeness" },
  async ({
    browser,
    page,
    programBuilder,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();

    // act
    await programBuilder.open(client.clientId);

    // assert
    await programBuilder.expectNoProgramYet(client.clientId);
    await expectOneH1AndNoSkippedLevels(page);

    // act
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await new ProgramBuilderPage(visitorPage).open(client.clientId);

    // assert
    await expect(visitorPage).toHaveURL(/\/sign-in/);
    await visitor.close();
  },
);

test(
  "the coach reorders blocks from the keyboard, hears each move, and the plan keeps one heading outline",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);

    // act
    await programBuilder.moveBlockUpByKeyboard("Hypertrophy");

    // assert
    await programBuilder.expectAnnounced(
      "Hypertrophy block moved to position 1 of 3",
    );
    await programBuilder.expectPlan([
      { type: "Hypertrophy", weeks: "6" },
      { type: "Foundation", weeks: "4" },
      { type: "Deload", weeks: "1" },
    ]);
    await expect(
      page.getByText("Foundation must be the first block").first(),
    ).toBeVisible();
    await expectOneH1AndNoSkippedLevels(page);
  },
);

test(
  "on a phone the sections open as a drawer and the week shows one day at a time, and nothing overflows on phone or desktop",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await setDesktopViewport(page);

    // assert
    await expectLayoutFits(page);

    // act
    await programBuilder.openBlockFromSections(1, "Foundation");
    await programBuilder.closeExerciseLibrary();

    // assert
    await programBuilder.expectOnlyDayMenusAndStrengthFacesInTheWeek(3);
    await expectLayoutFits(page);

    // act
    await setPhoneViewport(page);
    await programBuilder.openOverview();

    // assert
    await expectLayoutFits(page);

    // act
    await programBuilder.openSectionsDrawer();
    await programBuilder.openBlockFromDrawer(2, "Hypertrophy");
    await programBuilder.chooseDayTab("Wednesday");

    // assert
    await programBuilder.expectOpenSessionOffered();
    await expectLayoutFits(page);

    // act
    await programBuilder.chooseDayTab("Tuesday");

    // assert
    await programBuilder.expectNoOpenSessionOffered();
    await expectLayoutFits(page);
  },
);

test(
  "opening the builder at a block's address shows that block from the first paint and hydrates without a mismatch",
  { tag: "@completeness" },
  async ({
    coachClient,
    page,
    programBuilder,
    programSetup,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.buildProgram();
    await programSetup.create();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    const problems = collectPageProblems(page);

    // act
    const hydrate = await programBuilder.reloadHoldingHydration();

    // assert
    await programBuilder.expectNoOverviewShown();

    // act
    await hydrate();

    // assert
    await programBuilder.expectOnBlock(2, "Hypertrophy");
    expect(
      problems.filter((problem) => /hydrat|script tag/i.test(problem)),
    ).toEqual([]);
  },
);
