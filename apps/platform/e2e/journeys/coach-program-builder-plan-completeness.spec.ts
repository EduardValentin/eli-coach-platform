import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";

const JOURNEY_TIMEOUT_MS = 300_000;

test.use({ trace: "on" });

test(
  "the coach shapes the plan from the overview, is asked only when something is lost, and finds the plan after a reload",
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
    await page.goto(`/coach/clients/${client.clientId}/program/new`);

    // assert
    await programBuilder.expectOpenFor(client.fullName, client.clientId);

    // act
    await programBuilder.chooseLevel("Advanced");
    await programBuilder.chooseLanguage("Romanian");
    await programBuilder.openTimelineWeek(
      "Week 5 of 11, Hypertrophy week 1 of 6, open block",
    );

    // assert
    await programBuilder.expectOnBlock(2, "Hypertrophy");

    // act
    await programBuilder.openOverview();
    await programBuilder.typeBlockWeeks(2, "0");
    await programBuilder.leaveBlockWeeks(2);

    // assert
    await programBuilder.expectBlockWeeks(2, "6");

    // act
    await programBuilder.typeBlockWeeks(2, "2.5");
    await programBuilder.leaveBlockWeeks(2);

    // assert
    await programBuilder.expectBlockWeeks(2, "6");

    // act
    await programBuilder.typeBlockWeeks(2, "8");
    await programBuilder.chooseBlockType(3, "Strength");
    await programBuilder.typeBlockWeeks(3, "3");
    await programBuilder.chooseBlockType(3, "Deload");

    // assert
    await programBuilder.expectBlockWeeksFixedAtOne(3);

    // act
    await programBuilder.openAddBlockFromPlan();

    // assert
    await programBuilder.expectProposedBlock("Hypertrophy", "4");

    // act
    await programBuilder.cancelAddBlock();
    await programBuilder.openBlockFromSections(3, "Deload");
    const deloadSessions = await programBuilder.sessionsOfDayMenu("Monday");
    await programBuilder.openOverview();
    await programBuilder.openAddBlockFromPlan();
    await programBuilder.confirmAddBlock();

    // assert
    await programBuilder.expectOnBlock(4, "Hypertrophy");
    await programBuilder.expectPlaceHeadingFocused();
    await programBuilder.expectAnnounced("Hypertrophy block added as block 4");
    expect(await programBuilder.sessionsOfDayMenu("Monday")).toEqual(
      deloadSessions,
    );

    // act
    await programBuilder.openOverview();
    await programBuilder.openAddBlockFromPlan();

    // assert
    await programBuilder.expectProposedBlock("Deload", "1");
    await programBuilder.expectProposedWeeksFixed();

    // act
    await programBuilder.cancelAddBlock();
    await programBuilder.chooseBlockType(4, "Deload");
    await programBuilder.chooseBlockType(1, "Deload");
    await programBuilder.chooseBlockType(2, "Foundation");

    // assert
    await programBuilder.expectProblemOnBlock(
      1,
      "The plan cannot start with a Deload",
    );
    await programBuilder.expectProblemOnBlock(
      2,
      "Foundation must be the first block",
    );
    await programBuilder.expectProblemOnBlock(
      4,
      "Two Deloads cannot follow each other",
    );

    // act
    await programBuilder.expectSaved();
    await page.reload();

    // assert
    await programBuilder.expectLevel("Advanced");
    await programBuilder.expectLanguage("Romanian");
    await programBuilder.expectPlan([
      { type: "Deload", weeks: "1" },
      { type: "Foundation", weeks: "8" },
      { type: "Deload", weeks: "1" },
      { type: "Deload", weeks: "1" },
    ]);
    await programBuilder.expectProblemOnBlock(
      4,
      "Two Deloads cannot follow each other",
    );

    // act
    await programBuilder.dragBlockAbove("Foundation", 1);

    // assert
    await programBuilder.expectAnnounced(
      "Foundation block moved to position 1 of 4",
    );
    await programBuilder.expectNoProblemOnBlock(
      1,
      "Foundation must be the first block",
    );

    // act
    await programBuilder.askToRemoveBlockFromPlan(4, "Deload");

    // assert
    await programBuilder.expectConfirmationNaming("Remove block 4?", [
      "Easy cardio · 1 segment",
    ]);

    // act
    await programBuilder.cancelConfirmation("Remove block 4?");

    // assert
    await programBuilder.expectRemoveButtonFocused(4, "Deload");
    await programBuilder.expectPlan([
      { type: "Foundation", weeks: "8" },
      { type: "Deload", weeks: "1" },
      { type: "Deload", weeks: "1" },
      { type: "Deload", weeks: "1" },
    ]);

    // act
    await programBuilder.askToRemoveBlockFromPlan(4, "Deload");
    await programBuilder.confirm("Remove block 4?", "Remove block");

    // assert
    await programBuilder.expectBlockOpenerFocused(3, "Deload");

    // act
    for (const [position, type] of [
      [3, "Deload"],
      [2, "Deload"],
      [1, "Foundation"],
    ] as const) {
      await programBuilder.askToRemoveBlockFromPlan(position, type);
      await programBuilder.confirm(`Remove block ${position}?`, "Remove block");
    }

    // assert
    await programBuilder.expectSuggestion(
      "Hypertrophy 5 weeks → Deload 1 week → Strength 4 weeks → Deload 1 week",
    );

    // act
    await programBuilder.useSuggestion();

    // assert
    await programBuilder.expectPlan([
      { type: "Hypertrophy", weeks: "5" },
      { type: "Deload", weeks: "1" },
      { type: "Strength", weeks: "4" },
      { type: "Deload", weeks: "1" },
    ]);

    // act
    await programBuilder.expectSaved();
    await page.reload();

    // assert
    await programBuilder.expectPlan([
      { type: "Hypertrophy", weeks: "5" },
      { type: "Deload", weeks: "1" },
      { type: "Strength", weeks: "4" },
      { type: "Deload", weeks: "1" },
    ]);
  },
);

test(
  "the coach lays out a block's week and settings, is asked before anything is lost, and finds the block after a reload",
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
    await programBuilder.openBlockFromSections(3, "Deload");

    // assert
    await programBuilder.expectNoCalibration();

    // act
    await programBuilder.openBlockFromSections(2, "Hypertrophy");
    await programBuilder.chooseTrainingDays("3 days");
    await programBuilder.chooseSplit("Full Body");

    // assert
    await programBuilder.expectBlockActions(["Reset to split", "Remove block"]);
    await programBuilder.expectTrainingDayChoices([
      "2 days",
      "3 days",
      "4 days",
      "5 days",
    ]);
    await programBuilder.expectDaySpoken("Monday", "Full Body A about 0 min");
    await programBuilder.expectDaySpoken("Tuesday", "Easy cardio 30 min");
    await programBuilder.expectDaySpoken("Sunday", "Rest");
    await programBuilder.expectOnlyDayMenusInTheWeek();

    // act
    await programBuilder.chooseTrainingDaysExpectingConfirmation("5 days");

    // assert
    await programBuilder.expectConfirmationNaming("Change training days?", [
      "Moderate cardio · 1 segment",
    ]);

    // act
    await programBuilder.cancelConfirmation("Change training days?");

    // assert
    await programBuilder.expectTrainingDaysFocused();
    await programBuilder.expectTrainingDays("3 days");

    // act
    await programBuilder.resetToSplit();

    // assert
    await programBuilder.expectNoConfirmation();
    await programBuilder.expectDaySpoken("Monday", "Full Body A about 0 min");

    // act
    await programBuilder.putSessionOnDayByKeyboard("Sunday", "Full Body A");

    // assert
    await programBuilder.expectNoConfirmation();
    await programBuilder.expectDaySpoken("Sunday", "Full Body A about 0 min");
    await programBuilder.expectDaySpoken("Monday", "Rest");

    // act
    await programBuilder.chooseDayKind("Monday", "Cardio");

    // assert
    await programBuilder.expectNoConfirmation();
    await programBuilder.expectDaySpoken("Monday", "Cardio");

    // act
    await programBuilder.chooseDayKind("Tuesday", "Rest");

    // assert
    await programBuilder.expectConfirmationNaming("Make Tuesday a rest day?", [
      "Easy cardio · 1 segment",
    ]);

    // act
    await programBuilder.cancelConfirmation("Make Tuesday a rest day?");

    // assert
    await programBuilder.expectDayMenuFocused("Tuesday");
    await programBuilder.expectDay("Tuesday", "Easy cardio");

    // act
    await programBuilder.chooseDayKind("Tuesday", "Rest");
    await programBuilder.confirm("Make Tuesday a rest day?", "Change day");
    await programBuilder.switchCalibrationByKeyboard();
    await programBuilder.expectCalibrationExplained();
    await programBuilder.nameSplit("Three full days");
    await programBuilder.chooseOption("Target", "45 min");
    await programBuilder.chooseBlockHeaderType("Strength");

    // assert
    await programBuilder.expectOnBlock(2, "Strength");

    // act
    await programBuilder.expectSaved();
    await programBuilder.watchForOverviewPaint();
    const problems = collectPageProblems(page);
    await page.reload();

    // assert
    await programBuilder.expectOnBlock(2, "Strength");
    await programBuilder.expectNoOverviewPainted();
    expect(
      problems.filter((problem) => /hydrat|script tag/i.test(problem)),
    ).toEqual([]);
    await programBuilder.expectDaySpoken("Sunday", "Full Body A about 0 min");
    await programBuilder.expectDaySpoken("Monday", "Cardio");
    await programBuilder.expectDaySpoken("Tuesday", "Rest");
    await programBuilder.expectCalibrationOn();
    await programBuilder.expectSplitName("Three full days");
    await programBuilder.expectSelectReads("Target", "45 min");
    await programBuilder.expectTrainingDays("3 days");

    // act
    await programBuilder.removeBlockFromHeader();

    // assert
    await programBuilder.expectConfirmationNaming("Remove block 2?", [
      "Easy cardio · 1 segment",
      "Moderate cardio · 1 segment",
    ]);

    // act
    await programBuilder.confirm("Remove block 2?", "Remove block");

    // assert
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
    await programBuilder.expectPlan([
      { type: "Foundation", weeks: "4" },
      { type: "Deload", weeks: "1" },
    ]);
    await programBuilder.expectPlaceHeadingFocused();
  },
);
