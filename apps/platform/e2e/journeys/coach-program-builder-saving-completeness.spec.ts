import { expect, test } from "../support/fixtures";
import { expectOneH1AndNoSkippedLevels } from "../support/heading-outline";
import { ProgramBuilderPage } from "../support/program-builder-page";
import { setPhoneViewport } from "../support/viewport";

const JOURNEY_TIMEOUT_MS = 300_000;
const AUTOMATIC_RETRY_WAIT_MS = 20_000;
const SLOW_FAILURE_MS = 1_500;

test.use({ trace: "on" });

test(
  "saving stays quiet until it fails, a failed save retries by itself, on reconnecting and on Try again now, and every change is kept",
  { tag: "@completeness" },
  async ({
    coachClient,
    context,
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

    // assert
    await programBuilder.expectNoSaveState();

    // act
    await programBuilder.chooseLevel("Advanced");

    // assert
    await programBuilder.expectSaving();
    await programBuilder.expectSaved();

    // act
    await programBuilder.failSavesSlowly(SLOW_FAILURE_MS);
    await programBuilder.chooseLevel("Intermediate");

    // assert
    await programBuilder.expectStillFailing();
    await programBuilder.expectLevel("Intermediate");

    // act
    await programBuilder.tryAgainNow();

    // assert
    await programBuilder.expectTryingAgain();
    await programBuilder.expectTryAgainNowFocused();
    await programBuilder.expectAnnounced("Still not saved.");
    await programBuilder.expectStillFailing();

    // act
    await programBuilder.letSavesThrough();

    // assert
    await expect(async () => {
      await programBuilder.expectFailedAlertGone();
    }).toPass({ timeout: AUTOMATIC_RETRY_WAIT_MS });
    await programBuilder.expectSaved();
    await programBuilder.expectAnnounced("All changes saved.");

    // act
    await context.setOffline(true);
    await programBuilder.chooseLanguage("Romanian");

    // assert
    await programBuilder.expectStillFailing();

    // act
    await context.setOffline(false);

    // assert
    await programBuilder.expectFailedAlertGone();
    await programBuilder.expectSaved();

    // act
    await page.reload();

    // assert
    await programBuilder.expectLevel("Intermediate");
    await programBuilder.expectLanguage("Romanian");
    await programBuilder.expectNoSaveState();
  },
);

test(
  "leaving waits for a save in flight, the browser warns only while a change is unsent, and the older copy of a draft changes nothing",
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
    const releaseSave = await programBuilder.holdSaves();

    // act
    await programBuilder.chooseLevel("Advanced");
    await programBuilder.goBackToClient(client.fullName);

    // assert
    await programBuilder.expectSaving();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // act
    releaseSave();

    // assert
    await coachClient.expectOpen(client.clientId);

    // act
    await page.unrouteAll();
    await coachClient.continueDraft();

    // assert
    await programBuilder.expectLevel("Advanced");

    // act
    const unsentPage = await page.context().newPage();
    const unsentTab = new ProgramBuilderPage(unsentPage);
    await unsentTab.open(client.clientId);
    await unsentTab.failSaves();
    await unsentTab.chooseLanguage("Romanian");
    await unsentTab.expectFailedSave();
    const unsentWarning = unsentPage.waitForEvent("dialog");
    await unsentPage.close({ runBeforeUnload: true });

    // assert
    const warning = await unsentWarning;
    expect(warning.type()).toBe("beforeunload");
    await warning.accept();

    // act
    const savedPage = await page.context().newPage();
    const savedTab = new ProgramBuilderPage(savedPage);
    await savedTab.open(client.clientId);
    await savedTab.chooseLanguage("Romanian");
    await savedTab.expectSaved();
    const savedDialogs: string[] = [];
    savedPage.on("dialog", (dialog) => {
      savedDialogs.push(dialog.type());
      void dialog.dismiss();
    });

    // act
    const refusal = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        response
          .url()
          .endsWith(`/api/coach/clients/${client.clientId}/program/draft`),
    );
    await programBuilder.chooseLevel("Beginner");

    // assert
    const refused = await refusal;
    expect([refused.status(), await refused.json()]).toEqual([
      409,
      { error: "changed-elsewhere" },
    ]);
    await programBuilder.expectChangedElsewhere();
    await programBuilder.expectEditingLockedBehindChangedElsewhere();

    // act
    await savedPage.reload();

    // assert
    await savedTab.expectLevel("Advanced");
    await savedTab.expectLanguage("Romanian");
    expect(savedDialogs).toEqual([]);

    // act
    await programBuilder.reload();

    // assert
    await programBuilder.expectLevel("Advanced");
    await programBuilder.expectLanguage("Romanian");
    await programBuilder.expectPlaceHeadingFocused();
    await programBuilder.expectNoSaveState();
  },
);

test(
  "a change made just before the browser's Back is not lost",
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
    await programBuilder.goBackToClient(client.fullName);
    await coachClient.continueDraft();
    await programBuilder.expectOpenFor(client.fullName, client.clientId);

    // act
    await programBuilder.chooseLevel("Advanced");
    await page.goBack();
    await coachClient.expectOpen(client.clientId);
    await coachClient.continueDraft();

    // assert
    await programBuilder.expectLevel("Advanced");
  },
);

test(
  "the builder is operable from the keyboard on a phone, keeps its landmarks and outline, respects reduced motion, and an unknown client is not found",
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

    // assert
    await programBuilder.expectLandmarks();
    await expectOneH1AndNoSkippedLevels(page);

    // act
    await programBuilder.openBlockFromSections(2, "Hypertrophy");

    // assert
    await expectOneH1AndNoSkippedLevels(page);

    // act
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setPhoneViewport(page);
    await programBuilder.openSectionsDrawerByKeyboard();

    // assert
    await programBuilder.expectNoRunningAnimations();

    // act
    await programBuilder.closeSectionsDrawerByEscape();
    await programBuilder.openSectionsDrawerByKeyboard();
    await programBuilder.openBlockFromDrawerByKeyboard(3, "Deload");
    await programBuilder.chooseDayTab("Monday");

    // assert
    await programBuilder.expectOpenDaySpoken(/^Monday \S.* · ~?\d+ min$/);
    await expectOneH1AndNoSkippedLevels(page);

    // act
    const unknown = await page.goto(
      "/coach/clients/00000000-0000-4000-8000-000000000000/program/draft",
    );

    // assert
    expect(unknown?.status()).toBe(404);
  },
);
